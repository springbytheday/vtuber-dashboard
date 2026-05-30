"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";

export default function YoutubeCalendar() {
	const [events, setEvents] = useState([]);

	useEffect(() => {
		fetch("api/youtube")
			.then((res) => res.json())
			.then((data) => setEvents(data));
	}, []);

	return (
		<FullCalendar
			plugins={[dayGridPlugin]}
			initialView="dayGridMonth"
			events={events}
			eventClick={(info) => {
				info.jsEvent.preventDefault();
				window.open(info.event.url, "_blank");
			}}
		/>
	);
}
