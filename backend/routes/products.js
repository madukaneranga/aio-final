import express from "express";
import { authenticate, authorize, optionalAuth } from "../middleware/auth.js";
import productController from "../controllers/productController.js";
import { 
  validateCreateProduct, 
  validateUpdateProduct, 
  validateSearchProducts,
  validateProductId
} from "../validators/productValidator.js";


const router = express.Router();


// Routes
router.get("/", optionalAuth, productController.getAllProducts);
router.post("/listing", optionalAuth, validateSearchProducts, productController.searchProducts);
router.post("/sale-listing", productController.saleProducts);
router.get("/trending", productController.getTrendingProducts);
router.get("/recommendations", productController.getRecommendations);
router.get("/:id", validateProductId, productController.getProductById);

router.post("/", 
  authenticate, 
  authorize("store_owner"), 
  validateCreateProduct,
  productController.createProduct
);

router.put("/:id", 
  authenticate, 
  authorize("store_owner"), 
  validateProductId,
  validateUpdateProduct,
  productController.updateProduct
);

router.delete("/:id", 
  authenticate, 
  authorize("store_owner"), 
  validateProductId,
  productController.deleteProduct
);

router.post("/impression", productController.incrementImpression);

export default router;