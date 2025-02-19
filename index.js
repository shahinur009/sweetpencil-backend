const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

app.use(express.json());
app.use(cors());

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
    const orderCollections = client.db("sweetPencilBD").collection("orders");

    // get users from db
    app.get("/users", async (req, res) => {
      const result = await userCollections.find().toArray();
      res.send(result);
    });

    // add Product API
    app.post("/add-product", async (req, res) => {
      const product = req.body;
      const result = await productCollections.insertOne(product);
      res.send(result);
    });

    //Get card Data form Database
    app.get("/show-product", async (req, res) => {
      const result = await productCollections.find().toArray();
      res.send(result);
    });

    // dashboard stock show
    app.get("/stock", async (req, res) => {
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
      } = req.body;

      // Ensure that all required fields are provided
      if (
        !customerName ||
        !phone ||
        !address ||
        !productName ||
        !productPrice ||
        !quantity ||
        !courierFee ||
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

    // Banner section API's here:
    // POST endpoint to save banner data
    app.post("/create-banner", async (req, res) => {
      console.log("Request received at /create-banner");

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
        console.log("banner", await bannerCollections.find().toArray());
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
