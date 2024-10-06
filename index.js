const express = require("express");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();

const port = process.env.PORT || 5000;

// midelware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gc7k6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middelwares
const logger = async (req, res, next) => {
  console.log("called: ", req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("value of token in the middelwares: ", token);
  if (!token) {
    return res.status(401).send({ message: "not authorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      res.status(401).send({ message: "not authorized " });
    }
    // if token is valid then it would be decoded
    console.log("value in the token: ", decoded);
    req.user = decoded;
    next();
  });
};

// const verifyToken = async (req, res, next) => {
//   const token = req.cookies?.token;
//   console.log("value of token in middelwares", token);
//   if (!token) {
//     return res.status(401).send({ message: "not authorized" });
//   }
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     if (err) {
//       console.log(err);
//       return res.status(401).send({ message: "not authorized" });
//     }
//     // if token is valid then it would be decoded
//     console.log("value in the token", decoded);
//     req.user = decoded;
//     next();
//   });
// };

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carProject").collection("carService");
    const bookingCollection = client.db("carProject").collection("bookings");

    // auth realeted api
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    app.get("/services", logger, async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      // const options = {
      //   // Include only the `title` and `imdb` fields in the returned document
      //   projection: { title: 1, img: 1, price: 1 },
      // };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });
    //service releted web token

    // Bookings
    app.get("/bookings", logger, verifyToken, async (req, res) => {
      console.log("query email: ", req.query.email);
      console.log("User email: ", req.user.email);
      console.log("toktoken", req.cookies.token);
      console.log("user in the valid token: ", req.user);
      if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: "forbidded authorized" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const bookings = req.body;
      // console.log(bookings);
      const result = await bookingCollection.insertOne(bookings);
      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: id };
      const updateBooking = req.body;
      console.log(updateBooking);
      const updateDoc = {
        $set: {
          status: updateBooking.status,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Phone Server is running");
});

app.listen(port, () => {
  console.log(`Example Phone server running  on port ${port}`);
});
