// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: true },
	modules: ["@nuxtjs/tailwindcss"],

	tailwindcss: {
		cssPath: "~/assets/css/main.css",
	},

	app: {
		head: {
			title: "APU Class Timetables",
			meta: [
				{
					name: "description",
					content: "Visualise and manage your APU class timetable",
				},
			],
			link: [
				{ rel: "preconnect", href: "https://fonts.googleapis.com" },
				{
					rel: "preconnect",
					href: "https://fonts.gstatic.com",
					crossorigin: "",
				},
				{
					rel: "stylesheet",
					href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap",
				},
			],
		},
	},
	nitro: {
		preset: "github-pages",
	},
});
