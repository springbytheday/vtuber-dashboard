import YoutubeCalendar from "./components/youtubecalendar";

export default function HomePage() {
	return (
		<>
			<head>
				<title>Vtuber Tracker</title>
			</head>
			<main className="flex flex-col items-center w-full">
				<h1>Soma Haishin Calendar</h1>
				<div className="w-full items-center">
					<YoutubeCalendar />
				</div>
			</main>
		</>
	);
}
