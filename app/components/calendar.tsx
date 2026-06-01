"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Clock, Plus, X, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EventRow {
	id: string;
	title: string;
	start_at: string;
	end_at: string;
}

interface CalendarProps {
	initialEvents: EventRow[];
}

interface FormState {
	title: string;
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
}

// ── Supabase ──────────────────────────────────────────────────────────────────

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS: string[] = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS: string[] = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCalendar(year: number, month: number): (number | null)[] {
	const first = new Date(year, month, 1).getDay();
	const total = new Date(year, month + 1, 0).getDate();
	const cells: (number | null)[] = [];
	for (let i = 0; i < first; i++) cells.push(null);
	for (let d = 1; d <= total; d++) cells.push(d);
	return cells;
}

function toDateString(year: number, month: number, day: number): string {
	return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatTime(isoString: string): string {
	return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getEventsForDay(events: EventRow[], year: number, month: number, day: number): EventRow[] {
	const dayStart = new Date(year, month, day, 0, 0, 0).getTime();
	const dayEnd = new Date(year, month, day, 23, 59, 59).getTime();
	return events.filter((e) => {
		const start = new Date(e.start_at).getTime();
		const end = new Date(e.end_at).getTime();
		return start <= dayEnd && end >= dayStart;
	});
}

function hasEvents(events: EventRow[], year: number, month: number, day: number): boolean {
	return getEventsForDay(events, year, month, day).length > 0;
}

function defaultForm(dateStr: string): FormState {
	return { title: "", startDate: dateStr, startTime: "09:00", endDate: dateStr, endTime: "10:00" };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Calendar({ initialEvents }: CalendarProps) {
	const today = new Date();

	const [events, setEvents] = useState<EventRow[]>(initialEvents);
	const [calYear, setCalYear] = useState<number>(today.getFullYear());
	const [calMonth, setCalMonth] = useState<number>(today.getMonth());
	const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
	const [showModal, setShowModal] = useState<boolean>(false);
	const [form, setForm] = useState<FormState>(
		defaultForm(toDateString(today.getFullYear(), today.getMonth(), today.getDate())),
	);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const cells = buildCalendar(calYear, calMonth);

	const isToday = (d: number): boolean =>
		d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();

	const prevMonth = (): void => {
		if (calMonth === 0) {
			setCalYear((y) => y - 1);
			setCalMonth(11);
		} else setCalMonth((m) => m - 1);
		setSelectedDay(null);
	};

	const nextMonth = (): void => {
		if (calMonth === 11) {
			setCalYear((y) => y + 1);
			setCalMonth(0);
		} else setCalMonth((m) => m + 1);
		setSelectedDay(null);
	};

	const openModal = (): void => {
		const dateStr = selectedDay
			? toDateString(calYear, calMonth, selectedDay)
			: toDateString(today.getFullYear(), today.getMonth(), today.getDate());
		setForm(defaultForm(dateStr));
		setError(null);
		setShowModal(true);
	};

	const handleAddEvent = (): void => {
		setError(null);
		if (!form.title.trim()) {
			setError("Title is required.");
			return;
		}
		if (!form.startDate || !form.startTime) {
			setError("Start date and time are required.");
			return;
		}
		if (!form.endDate || !form.endTime) {
			setError("End date and time are required.");
			return;
		}

		const start_at = new Date(`${form.startDate}T${form.startTime}`).toISOString();
		const end_at = new Date(`${form.endDate}T${form.endTime}`).toISOString();

		if (new Date(end_at) <= new Date(start_at)) {
			setError("End must be after start.");
			return;
		}

		const optimisticId = `optimistic-${Date.now()}`;
		const optimisticEvent: EventRow = { id: optimisticId, title: form.title.trim(), start_at, end_at };
		setEvents((prev) => [...prev, optimisticEvent]);
		setShowModal(false);

		startTransition(async () => {
			const { data, error: sbError } = await supabase
				.from("events")
				.insert({ title: form.title.trim(), start_at, end_at })
				.select("id, title, start_at, end_at")
				.single();

			if (sbError || !data) {
				setEvents((prev) => prev.filter((e) => e.id !== optimisticId));
				setError(sbError?.message ?? "Failed to save event.");
				setShowModal(true);
				return;
			}
			setEvents((prev) => prev.map((e) => (e.id === optimisticId ? (data as EventRow) : e)));
		});
	};

	const handleDeleteEvent = (id: string): void => {
		setEvents((prev) => prev.filter((e) => e.id !== id));
		startTransition(async () => {
			const { error: sbError } = await supabase.from("events").delete().eq("id", id);
			if (sbError) console.error("[delete event]", sbError.message);
		});
	};

	const selectedEvents = selectedDay ? getEventsForDay(events, calYear, calMonth, selectedDay) : [];

	const inputClass =
		"w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 placeholder-stone-300 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all";

	return (
		<div className="col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div>
					<p className="text-xs text-stone-400 font-medium">Schedule</p>
					<p className="text-base font-bold text-stone-800 mt-0.5">
						{MONTHS[calMonth]} {calYear}
					</p>
				</div>
				<div className="flex items-center gap-1">
					<button
						onClick={prevMonth}
						className="p-1.5 rounded-lg hover:bg-stone-50 text-stone-300 hover:text-stone-500 transition-colors"
					>
						<ChevronLeft size={15} />
					</button>
					<button
						onClick={nextMonth}
						className="p-1.5 rounded-lg hover:bg-stone-50 text-stone-300 hover:text-stone-500 transition-colors"
					>
						<ChevronRight size={15} />
					</button>
					<button
						onClick={openModal}
						className="ml-1.5 flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-400 text-xs font-semibold rounded-xl hover:bg-rose-100 transition-colors"
					>
						<Plus size={12} strokeWidth={2.5} /> Add
					</button>
				</div>
			</div>

			{/* Day headers */}
			<div className="grid grid-cols-7 mb-1">
				{DAYS.map((d) => (
					<div key={d} className="text-center text-[11px] text-stone-300 font-semibold py-1">
						{d}
					</div>
				))}
			</div>

			{/* Cells */}
			<div className="grid grid-cols-7 gap-y-1">
				{cells.map((d, i) => (
					<div key={i} className="flex flex-col items-center">
						{d !== null ? (
							<button
								onClick={() => setSelectedDay(d)}
								className={`w-8 h-8 text-xs rounded-xl flex items-center justify-center transition-all duration-150 relative font-medium ${
									isToday(d)
										? "bg-rose-400 text-white font-bold shadow-sm"
										: selectedDay === d
											? "bg-rose-50 text-rose-500"
											: "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
								}`}
							>
								{d}
								{hasEvents(events, calYear, calMonth, d) && !isToday(d) && (
									<span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" />
								)}
							</button>
						) : (
							<div className="w-8 h-8" />
						)}
					</div>
				))}
			</div>

			{/* Selected day events */}
			<div className="mt-4 pt-4 border-t border-stone-50 space-y-2 min-h-[52px]">
				{selectedDay === null ? (
					<p className="text-xs text-stone-300">Select a day to view events</p>
				) : selectedEvents.length === 0 ? (
					<div className="flex items-center gap-2 text-xs text-stone-300">
						<Clock size={12} />
						<span>
							{MONTHS[calMonth]} {selectedDay} — no events
						</span>
					</div>
				) : (
					selectedEvents.map((ev) => (
						<div
							key={ev.id}
							className="flex items-center justify-between group bg-violet-50 rounded-xl px-3 py-2"
						>
							<div className="flex items-start gap-2">
								<span className="mt-1 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
								<div>
									<p className="text-xs font-semibold text-stone-700">{ev.title}</p>
									<p className="text-[10px] text-stone-400">
										{formatTime(ev.start_at)} – {formatTime(ev.end_at)}
									</p>
								</div>
							</div>
							<button
								onClick={() => handleDeleteEvent(ev.id)}
								disabled={isPending}
								className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-stone-300 hover:text-red-400 hover:bg-red-50 transition-all"
							>
								<Trash2 size={11} />
							</button>
						</div>
					))
				)}
			</div>

			{/* ── Add Event Modal ── */}
			{showModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
					<div
						className="bg-white rounded-3xl shadow-2xl p-6 w-84 space-y-4 border border-stone-100 font-murecho"
						style={{ width: "340px" }}
					>
						{/* Modal header */}
						<div className="flex items-center justify-between">
							<div>
								<p className="text-base font-bold text-stone-800 font-unbounded">New Event 🗓️</p>
								<p className="text-xs text-stone-400 mt-0.5">Add it to your schedule</p>
							</div>
							<button
								onClick={() => setShowModal(false)}
								className="p-1.5 rounded-xl hover:bg-stone-50 text-stone-300 hover:text-stone-500 transition-colors"
							>
								<X size={15} />
							</button>
						</div>

						{/* Error */}
						{error && (
							<p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
								{error}
							</p>
						)}

						{/* Title */}
						<div>
							<label className="block text-xs font-semibold text-stone-500 mb-1.5">Title</label>
							<input
								type="text"
								value={form.title}
								onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
								placeholder="What's happening?"
								className={inputClass}
							/>
						</div>

						{/* Start */}
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="block text-xs font-semibold text-stone-500 mb-1.5">Start date</label>
								<input
									type="date"
									value={form.startDate}
									onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
									className={inputClass}
								/>
							</div>
							<div>
								<label className="block text-xs font-semibold text-stone-500 mb-1.5">Start time</label>
								<input
									type="time"
									value={form.startTime}
									onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
									className={inputClass}
								/>
							</div>
						</div>

						{/* End */}
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="block text-xs font-semibold text-stone-500 mb-1.5">End date</label>
								<input
									type="date"
									value={form.endDate}
									onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
									className={inputClass}
								/>
							</div>
							<div>
								<label className="block text-xs font-semibold text-stone-500 mb-1.5">End time</label>
								<input
									type="time"
									value={form.endTime}
									onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
									className={inputClass}
								/>
							</div>
						</div>

						{/* Actions */}
						<div className="flex gap-2 pt-1">
							<button
								onClick={() => setShowModal(false)}
								className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={handleAddEvent}
								disabled={isPending}
								className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-rose-400 text-white hover:bg-rose-500 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
							>
								{isPending ? (
									<>
										<Loader2 size={13} className="animate-spin" /> Saving…
									</>
								) : (
									"Save event"
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
