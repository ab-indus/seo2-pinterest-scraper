import express from "express";
import cors from "cors";
import { chromium } from "playwright";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/scrape", async (req, res) => {
  const boardUrl = req.query.boardUrl;
  if (!boardUrl) {
    return res.status(400).json({ error: "Missing boardUrl parameter" });
  }

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(boardUrl, { waitUntil: "networkidle" });

    // Scroll to load all pins
    let previousHeight;
    while (true) {
      previousHeight = await page.evaluate("document.body.scrollHeight");
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      await page.waitForTimeout(2000);
      const newHeight = await page.evaluate("document.body.scrollHeight");
      if (newHeight === previousHeight) break;
    }

    // Extract pin links
    const pins = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href*='/pin/']"));
      const unique = [...new Set(links.map(a => a.href.split("?")[0]))];
      return unique.map(link => ({ link }));
    });

    await browser.close();
    res.json({ status: "success", count: pins.length, pins });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Scraping failed", details: error.message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`✅ Scraper running on port ${port}`));
