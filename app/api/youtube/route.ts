import { NextResponse } from "next/server";

export async function GET() {
	const API_KEY = process.env.YOUTUBE_API_KEY;
	const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

	const url =
		`https://www.googleapis.com/youtube/v3/search` +
		`?key=${API_KEY}` +
		`&channelId=${CHANNEL_ID}` +
		`&part=snippet,id` +
		`&order=date` +
		`&maxResults=50` +
		`&type=video`;

	console.log(url);

	const response = await fetch(url, {
		next: { revalidate: 3600 }, // cache for 1 hour
	});

	const data = await response.json();

	const events = data.items.map((video: any) => ({
		id: video.id.videoId,
		title: video.snippet.title,
		start: video.snippet.publishedAt,
		url: `https://youtube.com/watch?v=${video.id.videoId}`,
	}));

	return NextResponse.json(events);
}
