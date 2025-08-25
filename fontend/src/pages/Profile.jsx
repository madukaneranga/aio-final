import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import ImageUpload from "../components/ImageUpload";
import { User, Mail, Phone, MapPin, Camera } from "lucide-react";
import imageCompression from 'browser-image-compression';

//  ADDED: Firebase storage imports
import { uploadIdDocument } from "../utils/firebaseUpload";

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verificationDocument, setVerificationDocument] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchVerificationStatus();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/users/profile`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || {
            street: "",
            city: "",
            state: "",
            zipCode: "",
            country: "",
          },
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerificationStatus = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/users/verification-status`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setVerificationStatus(data);
      }
    } catch (error) {
      console.error("Error fetching verification status:", error);
    }
  };

  const handleVerificationUpload = async () => {
    if (!verificationDocument) {
      setError("Please select an ID or Passport image to upload");
      return;
    }

    setVerificationLoading(true);
    setError("");

    try {
      // Upload to Firebase Storage first using specialized ID document function
      const uploadResult = await uploadIdDocument(verificationDocument);

      if (!uploadResult.success) {
        setError("Failed to upload document to storage");
        return;
      }

      // Send Firebase URL to backend
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/users/upload-verification`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idDocumentUrl: uploadResult.url,
            originalName: uploadResult.originalName,
            size: uploadResult.size,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuccess("Verification document uploaded successfully! Your request is under review.");
        setVerificationDocument(null);
        await fetchVerificationStatus(); // Refresh status
        await fetchProfile(); // Refresh profile
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to upload verification document");
      }
    } catch (error) {
      console.error("Error uploading verification:", error);
      setError("Upload failed. Please try again.");
    } finally {
      setVerificationLoading(false);
    }
  };

  const getVerificationStatusBadge = (status) => {
    switch (status) {
      case "verified":
        return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">✓ Verified</span>;
      case "pending":
        return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">⏳ Under Review</span>;
      case "rejected":
        return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">✗ Rejected</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">Not Verified</span>;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      let imageUrl = null;

      if (profileImage) {
        const compressedFile = await imageCompression(profileImage, {
          maxSizeMB: 0.5, // compress to under 0.5 MB
          maxWidthOrHeight: 800, // resize to 800px max
          useWebWorker: true,
        });
        // Upload a single image to Firebase
        const imageRef = ref( storage, `users/${Date.now()}_${profileImage.name}`
        );
        await uploadBytes(imageRef, compressedFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address, // assuming it's already an object
        ...(imageUrl && { profileImage: imageUrl }), // only include if uploaded
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/users/profile`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setEditing(false);
        setProfileImage(null);
        setSuccess("Profile updated successfully!");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Please log in to view your profile
          </h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-black text-white px-6 py-8">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center">
                  {profile?.profileImage ? (
                    <img
                      src={
                        profile.profileImage.startsWith("http")
                          ? profile.profileImage
                          : `${import.meta.env.VITE_API_URL}${
                              profile.profileImage
                            }`
                      }
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-gray-300" />
                  )}
                </div>
                {editing && (
                  <label className="absolute bottom-0 right-0 bg-white text-black p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProfileImage(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {profile?.name || "User"}
                </h1>
                <p className="text-gray-300 capitalize">
                  {profile?.role || "Customer"}
                </p>
                <p className="text-gray-300">{profile?.email}</p>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                {success}
              </div>
            )}

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Profile Information
              </h2>
              <button
                onClick={() => setEditing(!editing)}
                className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                {editing ? "Cancel" : "Edit Profile"}
              </button>
            </div>

            {editing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Profile Image Upload */}
                {profileImage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Profile Image
                    </label>
                    <div className="flex items-center space-x-4">
                      <img
                        src={URL.createObjectURL(profileImage)}
                        alt="New profile"
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setProfileImage(null)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Address
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address
                      </label>
                      <input
                        type="text"
                        name="address.street"
                        value={formData.address.street}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        name="address.city"
                        value={formData.address.city}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        name="address.state"
                        value={formData.address.state}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        name="address.zipCode"
                        value={formData.address.zipCode}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        name="address.country"
                        value={formData.address.country}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Display Mode */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="font-medium">
                        {profile?.name || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">
                        {profile?.email || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">
                        {profile?.phone || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium">
                        {profile?.address ? (
                          <>
                            {profile.address.street && (
                              <>
                                {profile.address.street}
                                <br />
                              </>
                            )}
                            {profile.address.city &&
                              profile.address.state &&
                              `${profile.address.city}, ${profile.address.state} `}
                            {profile.address.zipCode}
                            {profile.address.country && (
                              <>
                                <br />
                                {profile.address.country}
                              </>
                            )}
                          </>
                        ) : (
                          "Not provided"
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Verification Section */}
          <div className="mt-8 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Document Verification
                </h2>
                {verificationStatus && getVerificationStatusBadge(verificationStatus.verificationStatus)}
              </div>
              <p className="text-gray-600 mt-2">
                Upload your ID or Passport to enable Cash on Delivery payment option
              </p>
            </div>

            <div className="p-6">
              {verificationStatus?.verificationStatus === "verified" ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="text-green-600 mr-3">✓</div>
                    <div>
                      <p className="font-medium text-green-800">
                        Your account is verified!
                      </p>
                      <p className="text-green-700 text-sm">
                        You can now use Cash on Delivery for your orders.
                      </p>
                    </div>
                  </div>
                </div>
              ) : verificationStatus?.verificationStatus === "pending" ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="text-yellow-600 mr-3">⏳</div>
                    <div>
                      <p className="font-medium text-yellow-800">
                        Verification in progress
                      </p>
                      <p className="text-yellow-700 text-sm">
                        Your document is under review. This usually takes 24-48 hours.
                      </p>
                      {verificationStatus.submittedAt && (
                        <p className="text-yellow-700 text-xs mt-1">
                          Submitted: {new Date(verificationStatus.submittedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : verificationStatus?.verificationStatus === "rejected" ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <div className="text-red-600 mr-3">✗</div>
                    <div>
                      <p className="font-medium text-red-800">
                        Verification rejected
                      </p>
                      <p className="text-red-700 text-sm">
                        Please upload a clear photo of your valid ID or Passport.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {(!verificationStatus?.verificationStatus || 
                verificationStatus?.verificationStatus === "unverified" || 
                verificationStatus?.verificationStatus === "rejected") && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload ID or Passport Image
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setVerificationDocument(e.target.files[0])}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-lg file:border-0
                          file:text-sm file:font-medium
                          file:bg-black file:text-white
                          hover:file:bg-gray-800"
                      />
                      <button
                        onClick={handleVerificationUpload}
                        disabled={!verificationDocument || verificationLoading}
                        className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {verificationLoading ? "Uploading..." : "Upload"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Accepted formats: JPG, PNG, GIF. Maximum size: 5MB
                    </p>
                  </div>

                  {verificationDocument && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                      <img
                        src={URL.createObjectURL(verificationDocument)}
                        alt="Document preview"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      <strong>Important:</strong> Please ensure your document is clear and all details are visible. 
                      Once uploaded, your document will be locked until verification is complete.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
