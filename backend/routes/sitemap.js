
import express from "express";
import Product from "../models/Product.js";
import Service from "../models/Service.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const products = await Product.find({}, "_id");
    const services = await Service.find({}, "_id");

    const staticUrls = `
  <url>
    <loc>https://aiocart.lk/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://aiocart.lk/products</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://aiocart.lk/services</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://aiocart.lk/categories</loc>
    <priority>0.7</priority>
  </url>
`;

    const productUrls = products
      .map(
        (p) => `
  <url>
    <loc>https://aiocart.lk/product/${p._id}</loc>
    <priority>0.8</priority>
  </url>`
      )
      .join("");

    const serviceUrls = services
      .map(
        (s) => `
  <url>
    <loc>https://aiocart.lk/service/${s._id}</loc>
    <priority>0.8</priority>
  </url>`
      )
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticUrls}
  ${productUrls}
  ${serviceUrls}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    console.error("Failed to generate sitemap:", err);
    res.status(500).send("Failed to generate sitemap");
  }
});

export default router;
