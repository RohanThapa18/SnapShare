import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    avatarUrl: { type: String, default: null },
    avatarPublicId: { type: String, default: null, select: false },
    isActive: { type: Boolean, default: true },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Instance method: compare a plaintext password against the stored hash
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Never leak the password hash even if a doc slips through without .select("-passwordHash")
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.avatarPublicId;   
    return ret;
  },
});

export default mongoose.model("User", userSchema);
