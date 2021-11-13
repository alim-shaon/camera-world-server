const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const ObjectId = require("mongodb").ObjectId;

const app = express();
const port = process.env.PORT || 5000;
// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sqcdt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// admin askd file jwt token
var serviceAccount = require("./camera-world-fy-firebase-adminsdk-908d7-3bc79ce602.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function verifyToken(req, res, next) {
  if (req.headers.authorization.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedUserEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("camera-world");
    const productsCollection = database.collection("products");
    const usersCollection = database.collection("users");
    const purchaseCollection = database.collection("purchase");
    const reviewCollection = database.collection("review");
    console.log("db connected");

    //all product get api
    app.get("/allproducts", async (req, res) => {
      const result = await productsCollection.find({}).toArray();
      res.send(result);
    });
    // admin all purchase get
    app.get("/allpurchase", verifyToken, async (req, res) => {
      const result = await purchaseCollection.find({}).toArray();
      res.send(result);
    });

    app.delete("/allproducts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.json(result);
    });

    // home pace limited product get api
    app.get("/products", async (req, res) => {
      const result = await productsCollection.find({}).limit(6).toArray();
      res.send(result);
    });

    // get single product api for purchase related information
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });
    // put api for adding new product
    app.post("/addProduct", async (req, res) => {
      const newPackage = req.body;
      const result = await productsCollection.insertOne(newPackage);
      res.json(result);
    });

    // user specific purchase  item get api
    app.get("/purchase", verifyToken, async (req, res) => {
      // query matching two variable
      const email = req.query.email;
      const query = { email: email };
      const cursor = purchaseCollection.find(query);
      const result = await cursor.toArray();
      res.json(result);
    });

    // delete purchase
    app.delete("/purchase", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await purchaseCollection.deleteOne(query);
      res.json(result);
    });

    // app.get("/purchase", async (req, res) => {
    //   const result = await purchaseCollection.find({}).toArray();
    //   res.send(result);
    // });

    // purchase put api for changing status by admin
    app.put("/allpurchase/:id", async (req, res) => {
      const id = req.params.id;
      const statusUpdate = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: statusUpdate.status,
        },
      };
      const result = await purchaseCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    // user purchase handel put api
    app.post("/purchase", async (req, res) => {
      const user = req.body;
      // console.log("put", user);
      const result = await purchaseCollection.insertOne(user);
      res.json(result);
    });

    // put api for set user in database
    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log("put", user);
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });

    // review post api
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      // console.log("put", review);
      const result = await reviewCollection.insertOne(review);
      res.json(result);
    });

    // review get api
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find({}).toArray();
      res.send(result);
    });

    // check whether user is admin or not
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    // set admin
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedUserEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res.status(403).json({ message: "you dont not have access" });
      }
    });
  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("running camera world server");
});
app.listen(port, () => {
  console.log("listining to port", port);
});
