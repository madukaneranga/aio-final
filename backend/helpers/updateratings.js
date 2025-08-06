// helpers/updateRatings.js
import Review from "../models/Review.js";
import Store from "../models/Store.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";

export async function updateStoreRating(storeId) {
  const reviews = await Review.find({ storeId });
  const avg = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  await Store.findByIdAndUpdate(storeId, { rating: avg });
}

export async function updateProductRating(productId) {
  const reviews = await Review.find({ productId });
  const avg = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  await Product.findByIdAndUpdate(productId, { rating: avg });
}

export async function updateServiceRating(serviceId) {
  const reviews = await Review.find({ serviceId });
  const avg = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  await Service.findByIdAndUpdate(serviceId, { rating: avg });
}
