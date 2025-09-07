require('dotenv').config();


// server.js
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json()); 

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.byszxkc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const courseCollection = client.db("courseManage").collection("courses");
    const enrollmentCollection = client.db("courseManage").collection("enrolls");

    // ================== Courses API ==================
    // Get all courses
    app.get("/courses", async (req, res) => {
      const courses = await courseCollection.find().toArray();
      res.send(courses);
    });

    // Get single course by ID
    app.get("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const course = await courseCollection.findOne({ _id: new ObjectId(id) });
      res.send(course);
    });

    // Add new course
    app.post("/courses", async (req, res) => {
      const { title, description, instructor, duration, price, image } = req.body;

      if (!title || !description || !instructor || !duration || !price || !image) {
        return res.status(400).send({ error: "All fields are required" });
      }

      const result = await courseCollection.insertOne(req.body);
      res.send(result); // returns insertedId
    });

    // ================== Enrollment API ==================
    // Add enrollment
    app.post("/enrolls", async (req, res) => {
      const enroll = req.body;
      const result = await enrollmentCollection.insertOne(enroll);
      res.send(result);
    });

    // Get all enrollments (optional filter by email)
    app.get("/enrolls", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) query.email = email;

      const enrollments = await enrollmentCollection.find(query).toArray();
      res.send(enrollments);
    });

    // Get user-specific enrollments with full course details
    app.get("/my-enrolls", async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ error: "Email query is required" });

      const enrollments = await enrollmentCollection.find({ email }).toArray();

      const detailedEnrollments = await Promise.all(
        enrollments.map(async (enroll) => {
          const course = await courseCollection.findOne({ _id: new ObjectId(enroll.courseId) });
          return {
            ...enroll,
            courseTitle: course?.title,
            courseDescription: course?.description,
            instructor: course?.instructor,
            duration: course?.duration,
            price: course?.price,
            courseImage: course?.image,
          };
        })
      );

      res.send(detailedEnrollments);
    });

    // Ping MongoDB
    // await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB successfully!");
  } finally {
    // Do not close client
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  res.send("Course management server is running!");
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
