"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Clock, Plus, X, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────────────────────

// Matches the `events` table:
//   id         uuid primary key default gen_random_uuid()
//   title      text        not null
//   start_at   timestamptz not null
//   end_at     timestamptz not null
//   created_at timestamptz not null default now()
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

// ── Supabase (client-side, public anon key only) ──────────────────────────────
// Add to .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
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

function formatDateTimeLocal(isoString: string): string {
	// Converts ISO to the format datetime-local input expects: YYYY-MM-DDTHH:MM
	return isoString.slice(0, 16);
}

function getEventsForDay(events: EventRow[], year: number, month: number, day: number): EventRow[] {
	const dayStart = new Date(year, month, day, 0, 0, 0).getTime();
	const dayEnd = new Date(year, month, day, 23, 59, 59).getTime();
	return events.filter((e) => {
		const start = new Date(e.start_at).getTime();
		const end = new Date(e.end_at).getTime();
		// Event overlaps with this day if it starts before day ends and ends after day starts
		return start <= dayEnd && end >= dayStart;
	});
}

function hasEvents(events: EventRow[], year: number, month: number, day: number): boolean {
	return getEventsForDay(events, year, month, day).length > 0;
}

function defaultForm(dateStr: string): FormState {
	return {
		title: "",
		startDate: dateStr,
		startTime: "09:00",
		endDate: dateStr,
		endTime: "10:00",
	};
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

		// Optimistic update
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
				// Roll back optimistic update
				setEvents((prev) => prev.filter((e) => e.id !== optimisticId));
				setError(sbError?.message ?? "Failed to save event.");
				setShowModal(true);
				return;
			}

			// Replace optimistic entry with real one
			setEvents((prev) => prev.map((e) => (e.id === optimisticId ? (data as EventRow) : e)));
		});
	};

	const handleDeleteEvent = (id: string): void => {
		// Optimistic removal
		setEvents((prev) => prev.filter((e) => e.id !== id));

		startTransition(async () => {
			const { error: sbError } = await supabase.from("events").delete().eq("id", id);
			if (sbError) {
				// Can't easily restore without refetching — just log
				console.error("[delete event]", sbError.message);
			}
		});
	};

	const selectedEvents = selectedDay ? getEventsForDay(events, calYear, calMonth, selectedDay) : [];

	return (
		<div className="col-span-2 bg-[#13131a] border border-[#1e1e26] p-5">
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div>
					<p className="text-[10px] uppercase tracking-widest text-[#555]">Schedule</p>
					<p className="text-sm font-bold text-white mt-0.5">
						{MONTHS[calMonth]} {calYear}
					</p>
				</div>
				<div className="flex items-center gap-1">
					<button
						onClick={prevMonth}
						className="p-1.5 hover:bg-white/5 text-[#555] hover:text-[#aaa] transition-colors"
					>
						<ChevronLeft size={13} />
					</button>
					<button
						onClick={nextMonth}
						className="p-1.5 hover:bg-white/5 text-[#555] hover:text-[#aaa] transition-colors"
					>
						<ChevronRight size={13} />
					</button>
					<button
						onClick={openModal}
						className="ml-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-[#e8ff47]/10 border border-[#e8ff47]/30 text-[#e8ff47] text-[10px] uppercase tracking-wider hover:bg-[#e8ff47]/20 transition-colors"
					>
						<Plus size={11} strokeWidth={2.5} /> Add
					</button>
				</div>
			</div>

			{/* Day headers */}
			<div className="grid grid-cols-7 mb-2">
				{DAYS.map((d) => (
					<div key={d} className="text-center text-[10px] text-[#444] uppercase tracking-wider py-1">
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
								className={`w-7 h-7 text-[11px] flex items-center justify-center transition-all duration-100 relative ${
									isToday(d)
										? "bg-[#e8ff47] text-[#0e0e12] font-bold"
										: selectedDay === d
											? "bg-white/10 text-white"
											: "text-[#888] hover:text-white hover:bg-white/5"
								}`}
							>
								{d}
								{hasEvents(events, calYear, calMonth, d) && !isToday(d) && (
									<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#a78bfa]" />
								)}
							</button>
						) : (
							<div className="w-7 h-7" />
						)}
					</div>
				))}
			</div>

			{/* Selected day events */}
			<div className="mt-4 pt-4 border-t border-[#1e1e26] space-y-2 min-h-[48px]">
				{selectedDay === null ? (
					<p className="text-[11px] text-[#444]">Select a day to view events</p>
				) : selectedEvents.length === 0 ? (
					<div className="flex items-center gap-2 text-[11px] text-[#444]">
						<Clock size={11} />
						<span>
							{MONTHS[calMonth]} {selectedDay} — no events
						</span>
					</div>
				) : (
					selectedEvents.map((ev) => (
						<div key={ev.id} className="flex items-center justify-between group">
							<div className="flex items-start gap-2">
								<span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#a78bfa] shrink-0" />
								<div>
									<p className="text-[11px] text-[#ccc]">{ev.title}</p>
									<p className="text-[10px] text-[#555]">
										{formatTime(ev.start_at)} – {formatTime(ev.end_at)}
									</p>
								</div>
							</div>
							<button
								onClick={() => handleDeleteEvent(ev.id)}
								disabled={isPending}
								className="opacity-0 group-hover:opacity-100 p-1 text-[#555] hover:text-red-400 transition-all"
							>
								<Trash2 size={11} />
							</button>
						</div>
					))
				)}
			</div>

			{/* ── Add Event Modal ── */}
			{showModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
					<div
						className="bg-[#13131a] border border-[#2a2a32] p-6 w-80 space-y-4"
						style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }}
					>
						{/* Modal header */}
						<div className="flex items-center justify-between">
							<p className="text-xs font-bold text-white uppercase tracking-widest">New Event</p>
							<button onClick={() => setShowModal(false)} className="text-[#555] hover:text-[#aaa]">
								<X size={14} />
							</button>
						</div>

						{/* Error */}
						{error && (
							<p className="text-[11px] text-red-400 border border-red-500/30 bg-red-500/10 px-3 py-1.5">
								{error}
							</p>
						)}

						{/* Title */}
						<div>
							<label className="block text-[10px] uppercase tracking-widest text-[#555] mb-1.5">
								Title
							</label>
							<input
								type="text"
								value={form.title}
								onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
								placeholder="Event title"
								className="w-full bg-[#0e0e12] border border-[#2a2a32] px-3 py-2 text-xs text-[#ccc] placeholder-[#444] outline-none focus:border-[#e8ff47]/50 transition-colors"
							/>
						</div>

						{/* Start */}
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="block text-[10px] uppercase tracking-widest text-[#555] mb-1.5">
									Start date
								</label>
								<input
									type="date"
									value={form.startDate}
									onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
									className="w-full bg-[#0e0e12] border border-[#2a2a32] px-2 py-2 text-xs text-[#ccc] outline-none focus:border-[#e8ff47]/50 transition-colors"
								/>
							</div>
							<div>
								<label className="block text-[10px] uppercase tracking-widest text-[#555] mb-1.5">
									Start time
								</label>
								<input
									type="time"
									value={form.startTime}
									onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
									className="w-full bg-[#0e0e12] border border-[#2a2a32] px-2 py-2 text-xs text-[#ccc] outline-none focus:border-[#e8ff47]/50 transition-colors"
								/>
							</div>
						</div>

						{/* End */}
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="block text-[10px] uppercase tracking-widest text-[#555] mb-1.5">
									End date
								</label>
								<input
									type="date"
									value={form.endDate}
									onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
									className="w-full bg-[#0e0e12] border border-[#2a2a32] px-2 py-2 text-xs text-[#ccc] outline-none focus:border-[#e8ff47]/50 transition-colors"
								/>
							</div>
							<div>
								<label className="block text-[10px] uppercase tracking-widest text-[#555] mb-1.5">
									End time
								</label>
								<input
									type="time"
									value={form.endTime}
									onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
									className="w-full bg-[#0e0e12] border border-[#2a2a32] px-2 py-2 text-xs text-[#ccc] outline-none focus:border-[#e8ff47]/50 transition-colors"
								/>
							</div>
						</div>

						{/* Actions */}
						<div className="flex gap-2 pt-1">
							<button
								onClick={() => setShowModal(false)}
								className="flex-1 py-2 text-[10px] uppercase tracking-widest border border-[#2a2a32] text-[#555] hover:border-[#444] hover:text-[#888] transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={handleAddEvent}
								disabled={isPending}
								className="flex-1 py-2 text-[10px] uppercase tracking-widest bg-[#e8ff47] text-[#0e0e12] font-bold hover:bg-[#d4f000] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
							>
								{isPending ? (
									<>
										<Loader2 size={11} className="animate-spin" /> Saving
									</>
								) : (
									"Save"
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
