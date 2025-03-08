const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

app.use(express.json());
app.use(
  cors({
    origin: ["https://sweetpencilbd.online", "http://localhost:5000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6ypdnj9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const userCollections = client.db("sweetPencilBD").collection("users");
    const productCollections = client
      .db("sweetPencilBD")
      .collection("products");
    const bannerCollections = client.db("sweetPencilBD").collection("banners");
    const galleryCollections = client
      .db("sweetPencilBD")
      .collection("galleries");
    const videoCollections = client.db("sweetPencilBD").collection("videos");
    const orderCollections = client.db("sweetPencilBD").collection("orders");

    // get users from db
    app.post("/login", async (req, res) => {
      console.log(req.body);
      const { email, password } = req.body;
      const user = await userCollections.findOne({ email });

      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      res.json({ message: "Login successful", user });
    });

    // add Product API
    app.post("/add-product", async (req, res) => {
      try {
        const product = req.body;
        const result = await productCollections.insertOne(product);
        res.send(result);
      } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).send({ message: "Error adding product", error });
      }
    });

    //Get card Data form Database
    app.get("/show-product", async (req, res) => {
      try {
        const result = await productCollections.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ message: "Failed to fetch products", error });
      }
    });

    // dashboard stock show
    app.get("/stock", async (req, res) => {
      try {
        const { category, page, limit } = req.query;
        const query = category ? { category } : {};
        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 3;
        const skip = (pageNumber - 1) * limitNumber;

        const totalCount = await productCollections.countDocuments(query);
        const products = await productCollections
          .find(query)
          .skip(skip)
          .limit(limitNumber)
          .toArray();

        res.send({ products, totalCount });
      } catch (error) {
        console.error("Error fetching stock:", error);
        res.status(500).json({ message: "Failed to fetch stock data", error });
      }
    });

    //for details page
    app.get("/show-product/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid Product ID" });
      }
      try {
        const query = { _id: new ObjectId(id) };
        const result = await productCollections.findOne(query);
        if (!result) {
          return res.status(404).send({ error: "Product not found" });
        }
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to fetch product data", error });
      }
    });
    // single order get by ID
    app.get("/singleProduct/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid Product ID" });
      }
      try {
        const query = { _id: new ObjectId(id) };
        const result = await productCollections.findOne(query);
        if (!result) {
          return res.status(404).send({ error: "Product not found" });
        }
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to fetch product data", error });
      }
    });
    // Product delete API here:
    app.delete("/delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await productCollections.deleteOne(query);
        if (result.deletedCount === 1) {
          res.status(200).send({ message: "Product deleted successfully" });
        } else {
          res.status(404).send({ message: "Product not found" });
        }
      } catch (error) {
        res.status(500).send({ message: "Error deleting product", error });
      }
    });

    // Update product data
    app.put("/updateProduct/:id", async (req, res) => {
      const id = req.params.id;
      let updateData = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid Product ID" });
      }

      try {
        const query = { _id: new ObjectId(id) };

        console.log("Received update request for ID:", id);
        console.log("Update Data Before Filtering:", updateData);

        // Ensure _id is removed from updateData
        delete updateData._id;

        console.log("Update Data After Filtering:", updateData);

        const result = await productCollections.updateOne(query, {
          $set: updateData,
        });

        if (!result.matchedCount) {
          return res.status(404).send({ error: "Product not found" });
        }

        res.send({ message: "Product updated successfully" });
      } catch (error) {
        console.error("Error updating product:", error.message, error.stack);
        res.status(500).send({
          message: "Failed to update product data",
          error: error.message,
        });
      }
    });
    // place order:
    app.post("/place-order", async (req, res) => {
      console.log("Request received at /create-order");

      const {
        customerName,
        phone,
        address,
        productName,
        productPrice,
        quantity,
        courierFee,
        totalCost,
        status,
      } = req.body;

      if (
        !customerName ||
        !phone ||
        !address ||
        !productName ||
        !productPrice ||
        !quantity ||
        !totalCost
      ) {
        return res.status(400).json({ message: "All fields are required" });
      }

      try {
        const result = await orderCollections.insertOne({
          customerName,
          phone,
          address,
          productName,
          productPrice,
          quantity,
          courierFee,
          totalCost,
          orderDate: new Date(),
          status: "pending",
        });

        res.json({
          message: "Order placed successfully!",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error saving order data to MongoDB", error);
        res.status(500).json({ message: "Failed to place the order" });
      }
    });
    // get dashboard orders table data
    app.get("/orders", async (req, res) => {
      const { status, page, limit } = req.query;
      const query = status ? { status } : {};

      const orders = await orderCollections
        .find(query)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .toArray();

      const totalCount = await orderCollections.countDocuments(query);

      res.send({ orders, totalCount });
    });

    // Delete dashboard order list
    app.delete("/orders/:id", async (req, res) => {
      const { id } = req.params;

      console.log("Received delete request for ID:", id); // Debugging

      try {
        const result = await orderCollections.deleteOne({
          _id: new ObjectId(id),
        });

        console.log("Delete result:", result);
        console.log("Deleting order with ID:", id);

        if (result.deletedCount > 0) {
          res.json({ success: true, message: "Order deleted successfully" });
        } else {
          res.status(404).json({ success: false, message: "Order not found" });
        }
      } catch (error) {
        console.error("Error deleting order:", error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    });

    // Banner section API's here:
    // POST endpoint to save banner data
    app.post("/create-banner", async (req, res) => {
      const { bannerImage } = req.body;
      if (!bannerImage) {
        return res.status(400).json({ message: "Image URL is required" });
      }

      try {
        const result = await bannerCollections.insertOne({ bannerImage });
        res.json({
          message: "Banner data saved successfully!",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error saving data to MongoDB", error);
        res.status(500).json({ message: "Failed to save banner data" });
      }
    });

    // GET endpoint to fetch all banners
    app.get("/get-banner", async (req, res) => {
      try {
        const banners = await bannerCollections.find().toArray();
        res.json(banners);
      } catch (error) {
        console.error("Error fetching banners:", error);
        res.status(500).json({ message: "Failed to fetch banners" });
      }
    });

    //   Banner Deleted API's
    app.delete("/banner-delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await bannerCollections.deleteOne(query);
        if (result.deletedCount === 1) {
          res.status(200).send({ message: "Banner deleted successfully" });
        } else {
          res.status(404).send({ message: "Banner not found" });
        }
      } catch (error) {
        res.status(500).send({ message: "Error deleting Banner", error });
      }
    });

    // create gallery here
    app.post("/create-gallery", async (req, res) => {
      console.log("Request received at /create-gallery");

      const { galleryImage } = req.body;
      if (!galleryImage) {
        return res.status(400).json({ message: "Image URL is required" });
      }

      try {
        const result = await galleryCollections.insertOne({
          galleryImage,
        });
        res.json({
          message: "gallery data saved successfully!",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error saving data to MongoDB", error);
        res.status(500).json({ message: "Failed to save gallery data" });
      }
    });

    // GET all gallery
    app.get("/gallery", async (req, res) => {
      try {
        const gallery = await galleryCollections.find().toArray();
        res.json(gallery);
        // console.log("gallery", gallery);
      } catch (error) {
        console.error("Error fetching gallery:", error);
        res.status(500).json({ message: "Failed to fetch gallery" });
      }
    });

    //   gallery Deleted API's
    app.delete("/gallery-delete/:id", async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid gallery ID" });
      }
      try {
        const result = await galleryCollections.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 1) {
          res.status(200).json({ message: "Gallery deleted successfully" });
        } else {
          res.status(404).json({ message: "Gallery not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error deleting gallery", error });
      }
    });
    // create video here
    app.post("/create-video", async (req, res) => {
      console.log("Request received at /create-video");

      const { videos } = req.body;
      if (!videos) {
        return res.status(400).json({ message: "video URL is required" });
      }

      try {
        const result = await videoCollections.insertOne({
          videos,
        });
        res.json({
          message: "video data saved successfully!",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error saving data to MongoDB", error);
        res.status(500).json({ message: "Failed to save videos data" });
      }
    });

    // GET all video
    app.get("/videos", async (req, res) => {
      try {
        const video = await videoCollections.find().toArray();
        res.json(video);
        // console.log("video", video);
      } catch (error) {
        console.error("Error fetching video:", error);
        res.status(500).json({ message: "Failed to fetch video" });
      }
    });

    //   video Deleted API's
    app.delete("/video-delete/:id", async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid video ID" });
      }
      try {
        const result = await videoCollections.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 1) {
          res.status(200).json({ message: "video deleted successfully" });
        } else {
          res.status(404).json({ message: "video not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error deleting video ", error });
      }
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running on sweetPencilBD");
});

app.listen(port, () => {
  console.log(`sweetPencilBD server is running on ${port}`);
});
