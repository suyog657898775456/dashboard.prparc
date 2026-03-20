import React from "react";
import { MapPin, Phone, Mail, Globe } from "lucide-react";
import axios from "axios";

const API_URL = "http://localhost:5000/api/contact";

const ContactInfo = ({ contact, setContact, setPendingChanges }) => {
  const handleSave = async () => {
    try {
      const response = await axios.put(API_URL, contact);
      alert("Contact information updated successfully!");
      setPendingChanges((prev) => ({ ...prev, contact: false }));
      setContact(response.data);
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to update contact info.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            <MapPin className="mr-2" size={16} />
            Address
          </label>
          <input
            type="text"
            value={contact.address[0] || ""}
            onChange={(e) => {
              const updated = [...contact.address];
              updated[0] = e.target.value;
              setContact({ ...contact, address: updated });
              setPendingChanges((prev) => ({ ...prev, contact: true }));
            }}
            className="w-full p-3 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Phone className="mr-2" size={16} /> Phone number
          </label>
          <input
            type="text"
            value={contact.phone || ""}
            onChange={(e) => {
              setContact({ ...contact, phone: e.target.value });
              setPendingChanges((prev) => ({ ...prev, contact: true }));
            }}
            className="w-full p-3 border border-gray-300 rounded-lg text-sm"
            maxLength={10}
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Mail className="mr-2" size={16} /> Email ID
          </label>
          <input
            type="text"
            value={contact.email || ""}
            onChange={(e) => {
              setContact({ ...contact, email: e.target.value });
              setPendingChanges((prev) => ({ ...prev, contact: true }));
            }}
            className="w-full p-3 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Social Media Links */}
      <div className="pt-4 border-t border-gray-200">
        <h3 className="font-medium mb-4 flex items-center text-sm text-gray-700">
          <Globe className="mr-2" size={16} /> Social Media Links
        </h3>
        <div className="space-y-4">
          {["facebook", "instagram", "youtube", "google"].map((platform) => (
            <input
              key={platform}
              type="text"
              placeholder={platform.charAt(0).toUpperCase() + platform.slice(1)}
              value={contact.social[platform] || ""}
              onChange={(e) => {
                setContact({
                  ...contact,
                  social: { ...contact.social, [platform]: e.target.value },
                });
                setPendingChanges((prev) => ({ ...prev, contact: true }));
              }}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm"
            />
          ))}
        </div>
      </div>

      <button
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold mt-4 hover:bg-blue-700 transition-colors"
        onClick={handleSave}
      >
        Save Contact Changes
      </button>
    </div>
  );
};

export default ContactInfo;
