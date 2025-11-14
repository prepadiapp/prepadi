console.log("--- Environment Check (Prisma Context) ---");
console.log("Project Root:", process.cwd());
console.log("DATABASE_URL found:", !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
    // Print only the start and end of the URL to prevent showing the full password
    const url = process.env.DATABASE_URL;
    console.log("DATABASE_URL start:", url.substring(0, 30) + "...");
    console.log("DATABASE_URL end:", "..." + url.substring(url.length - 10));
} else {
    console.log("DATABASE_URL value: UNDEFINED");
}
console.log("-----------------------------------------");