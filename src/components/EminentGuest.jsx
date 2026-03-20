"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Search,
  Users,
  X,
  UserPlus,
  Image as ImageIcon,
  Upload,
  Edit2,
  Star,
  ChevronRight,
  Save,
  Trash2,
  Info,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${API_BASE_URL}/api/guests`;

const EminentGuestsDashboard = () => {
  const [guests, setGuests] = useState([]);
  const [filteredGuests, setFilteredGuests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [newGuest, setNewGuest] = useState({
    name: "",
    designation: "",
    image: "",
    file: null,
  });
  const [editedGuest, setEditedGuest] = useState({
    id: null,
    name: "",
    designation: "",
    image: "",
    featured: false,
    file: null,
  });
  const [guestToDelete, setGuestToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  // --- BACKEND FETCH ---
  const fetchGuests = async () => {
    try {
      const res = await axios.get(API_URL);
      setGuests(res.data);
      setFilteredGuests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  useEffect(() => {
    const result = guests.filter(
      (guest) =>
        guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.designation.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredGuests(result);
  }, [searchTerm, guests]);

  const handleAddGuest = async () => {
    if (!newGuest.name || !newGuest.designation)
      return alert("Fill required fields");
    const data = new FormData();
    data.append("name", newGuest.name);
    data.append("designation", newGuest.designation);
    if (newGuest.file) data.append("image", newGuest.file);

    try {
      await axios.post(API_URL, data);
      fetchGuests();
      setShowAddForm(false);
      setNewGuest({ name: "", designation: "", image: "", file: null });
    } catch (err) {
      alert("Add failed");
    }
  };

  const saveEditedGuest = async () => {
    const data = new FormData();
    data.append("name", editedGuest.name);
    data.append("designation", editedGuest.designation);
    data.append("featured", editedGuest.featured);
    if (editedGuest.file) data.append("image", editedGuest.file);

    try {
      await axios.put(`${API_URL}/${editedGuest.id}`, data);
      fetchGuests();
      setShowEditForm(false);
    } catch (err) {
      alert("Update failed");
    }
  };

  const toggleFeatured = async (guest, e) => {
    if (e) e.stopPropagation();
    try {
      await axios.put(`${API_URL}/${guest.id}`, {
        ...guest,
        featured: !guest.featured,
      });
      fetchGuests();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteGuest = async () => {
    try {
      await axios.delete(`${API_URL}/${guestToDelete.id}`);
      fetchGuests();
      setShowDeleteConfirm(false);
    } catch (err) {
      alert("Delete failed");
    }
  };

  // --- IMAGE HELPERS ---
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setNewGuest({ ...newGuest, file, image: URL.createObjectURL(file) });
    }
  };

  const handleEditImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setEditedGuest({
        ...editedGuest,
        file,
        image: URL.createObjectURL(file),
      });
    }
  };

  const startEditing = (guest) => {
    setEditedGuest({ ...guest, file: null });
    setShowEditForm(true);
  };

  const handleEditChange = (field, value) => {
    setEditedGuest((prev) => ({ ...prev, [field]: value }));
  };

  const cancelEditing = () => setShowEditForm(false);
  const confirmDelete = (guest) => {
    setGuestToDelete(guest);
    setShowDeleteConfirm(true);
  };
  const cancelDelete = () => setShowDeleteConfirm(false);
  const resetFilters = () => setSearchTerm("");
  const handleImageClick = () => fileInputRef.current?.click();
  const handleEditImageClick = () => editFileInputRef.current?.click();

  if (loading) return <div className="p-10 text-center">Loading Guests...</div>;

  // Guest Card Component
  const GuestCard = ({ guest }) => (
    <div className="relative bg-white w-64 rounded-xl shadow-xl overflow-hidden text-center border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="relative">
        <div className="h-52 bg-gray-100 overflow-hidden">
          {guest.image ? (
            <img
              src={guest.image}
              alt={guest.name}
              className="w-full h-64 object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <Users className="text-gray-400" size={48} />
            </div>
          )}
        </div>
        <button
          onClick={(e) => toggleFeatured(guest, e)}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all ${guest.featured ? "bg-yellow-400" : "bg-white/80"}`}
        >
          <Star
            size={20}
            className={
              guest.featured ? "text-white fill-white" : "text-gray-400"
            }
          />
        </button>
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button
            onClick={() => startEditing(guest)}
            className="p-2 bg-blue-200 text-blue-600 rounded-full shadow-lg"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => confirmDelete(guest)}
            className="p-2 bg-red-200 text-red-600 rounded-full shadow-lg"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="p-6">
        <h3 className="font-bold text-xl text-gray-800 mb-2">{guest.name}</h3>
        <p className="text-gray-600 text-base">{guest.designation}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6 overflow-x-hidden">
      <div className="max-w-6xl mx-auto relative">
        <header className="mb-8 md:mb-12 flex justify-between items-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800">
            Eminent Guests
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-blue-400/30 text-blue-950 rounded-lg shadow-lg font-semibold flex items-center gap-2"
          >
            <UserPlus size={20} /> Add Guest
          </button>
        </header>

        <div className="mb-6 relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search guests..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid justify-items-center grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-8">
          {filteredGuests.map((guest) => (
            <GuestCard key={guest.id} guest={guest} />
          ))}
        </div>

        {/* Empty State */}
        {filteredGuests.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl shadow">
            <Users className="mx-auto text-gray-300 mb-4" size={64} />
            <h3 className="text-xl font-medium">No guests found</h3>
            <button
              onClick={resetFilters}
              className="mt-4 text-blue-600 underline"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Add Side Panel */}
        <div
          className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 ${showAddForm ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="h-full flex flex-col p-6">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold">Add New Guest</h3>
              <button onClick={() => setShowAddForm(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="space-y-6 overflow-y-auto flex-1">
              <div
                onClick={handleImageClick}
                className="w-full aspect-square border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer overflow-hidden"
              >
                {newGuest.image ? (
                  <img
                    src={newGuest.image}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon size={48} className="text-gray-300" />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
              <input
                type="text"
                placeholder="Name"
                className="w-full p-3 border rounded-lg"
                value={newGuest.name}
                onChange={(e) =>
                  setNewGuest({ ...newGuest, name: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Designation"
                className="w-full p-3 border rounded-lg"
                value={newGuest.designation}
                onChange={(e) =>
                  setNewGuest({ ...newGuest, designation: e.target.value })
                }
              />
            </div>
            <button
              onClick={handleAddGuest}
              className="w-full py-3 bg-blue-400/30 text-blue-950 font-bold rounded-lg mt-4"
            >
              Add Guest
            </button>
          </div>
        </div>

        {/* Edit Side Panel */}
        <div
          className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 ${showEditForm ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="h-full flex flex-col p-6">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold">Edit Guest</h3>
              <button onClick={cancelEditing}>
                <X size={24} />
              </button>
            </div>
            <div className="space-y-6 overflow-y-auto flex-1">
              <div
                onClick={handleEditImageClick}
                className="w-full aspect-square border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer overflow-hidden"
              >
                {editedGuest.image ? (
                  <img
                    src={editedGuest.image}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon size={48} className="text-gray-300" />
                )}
                <input
                  ref={editFileInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleEditImageUpload}
                />
              </div>
              <input
                type="text"
                placeholder="Name"
                className="w-full p-3 border rounded-lg"
                value={editedGuest.name}
                onChange={(e) => handleEditChange("name", e.target.value)}
              />
              <input
                type="text"
                placeholder="Designation"
                className="w-full p-3 border rounded-lg"
                value={editedGuest.designation}
                onChange={(e) =>
                  handleEditChange("designation", e.target.value)
                }
              />
            </div>
            <button
              onClick={saveEditedGuest}
              className="w-full py-3 bg-blue-400/30 text-blue-950 font-bold rounded-lg mt-4"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white p-8 rounded-2xl max-w-sm text-center">
              <Trash2 size={48} className="text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-4">Are you sure?</h3>
              <div className="flex gap-4">
                <button
                  onClick={cancelDelete}
                  className="flex-1 py-2 border rounded-lg"
                >
                  No
                </button>
                <button
                  onClick={deleteGuest}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EminentGuestsDashboard;
