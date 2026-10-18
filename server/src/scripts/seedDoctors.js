import "dotenv/config";
import dns from "node:dns";

dns.setServers(["10.209.170.112"]);

import mongoose from "mongoose";
import Doctor from "../models/Doctor.js";

const doctors = [
  {
    name: "Dr. Ananya Raman",
    specialty: "General Medicine",
    qualification: "MBBS, MD",
    fee: 500,
    availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  },
  {
    name: "Dr. Arjun Kumar",
    specialty: "Cardiology",
    qualification: "MBBS, MD, DM",
    fee: 900,
    availableDays: ["Mon", "Wed", "Fri"],
  },
  {
    name: "Dr. Priya Selvam",
    specialty: "Pediatrics",
    qualification: "MBBS, MD",
    fee: 600,
    availableDays: ["Tue", "Thu", "Sat"],
  },
  {
    name: "Dr. Karthik Raj",
    specialty: "Orthopedics",
    qualification: "MBBS, MS",
    fee: 700,
    availableDays: ["Mon", "Tue", "Thu", "Sat"],
  },
  {
    name: "Dr. Meera S",
    specialty: "Dermatology",
    qualification: "MBBS, MD",
    fee: 650,
    availableDays: ["Wed", "Thu", "Fri"],
  },
];

async function seedDoctors() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from the server .env file.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB Atlas.");

  let inserted = 0;
  let activated = 0;

  for (const doctor of doctors) {
    const existing = await Doctor.findOne({ name: doctor.name });

    if (!existing) {
      await Doctor.create({
        ...doctor,
        active: true,
      });

      inserted++;
      console.log(`Added: ${doctor.name}`);
    } else {
      const wasInactive = existing.active !== true;

      existing.active = true;
      existing.specialty = doctor.specialty;
      existing.qualification = doctor.qualification;
      existing.fee = doctor.fee;
      existing.availableDays = doctor.availableDays;

      await existing.save();

      if (wasInactive) activated++;

      console.log(`Updated: ${doctor.name}`);
    }
  }

  const activeCount = await Doctor.countDocuments({ active: true });

  console.log(`New doctors added: ${inserted}`);
  console.log(`Existing doctors activated: ${activated}`);
  console.log(`Total active doctors: ${activeCount}`);
}

try {
  await seedDoctors();
} catch (error) {
  console.error("Doctor seeding failed:", error.message);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
