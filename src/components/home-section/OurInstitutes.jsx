"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Plus,
  X,
  Trash2,
  Edit2,
  BookOpen,
  Image as ImageIcon,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${API_BASE_URL}/api/institutes`;

const OurInstitutes = () => {
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingInstitute, setEditingInstitute] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    image: null,
    imagePreview: null,
  });
  const [isUploading, setIsUploading] = useState(false);

  // --- BACKEND LOGIC ---
  const fetchInstitutes = async () => {
    try {
      const res = await axios.get(API_URL);
      setInstitutes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return alert("Enter title");

    setIsUploading(true);
    const data = new FormData();
    data.append("title", formData.title);
    if (formData.image) data.append("image", formData.image);

    try {
      if (editingInstitute)
        await axios.put(`${API_URL}/${editingInstitute.id}`, data);
      else await axios.post(API_URL, data);
      fetchInstitutes();
      setShowForm(false);
    } catch (err) {
      alert("Operation failed");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API_URL}/${editingInstitute.id}`);
      fetchInstitutes();
      setShowDeleteConfirm(false);
    } catch (err) {
      alert("Delete failed");
    }
  };
  // --- END BACKEND LOGIC ---

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        image: file,
        imagePreview: URL.createObjectURL(file),
      });
    }
  };

  const handleAddNew = () => {
    setEditingInstitute(null);
    setFormData({ title: "", image: null, imagePreview: null });
    setShowForm(true);
  };

  const handleEdit = (institute) => {
    setEditingInstitute(institute);
    setFormData({
      title: institute.title,
      image: null,
      imagePreview: institute.image,
    });
    setShowForm(true);
  };

  if (loading)
    return (
      <div className="p-10 text-center font-bold">Loading Institutes...</div>
    );

  const InstituteCard = ({ institute }) => (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all border border-gray-200">
      <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
        <img
          src={institute.image}
          alt={institute.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-3 right-2 flex gap-2">
          <button
            onClick={() => handleEdit(institute)}
            className="p-2 bg-blue-200 text-blue-600 rounded-2xl"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setEditingInstitute(institute);
              setShowDeleteConfirm(true);
            }}
            className="p-2 bg-red-200 text-red-600 rounded-2xl"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-900 text-center truncate">
          {institute.title}
        </h3>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen max-w-6xl mx-auto">
      <div className="mb-8 flex justify-end">
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-6 py-3 bg-blue-400/30 text-blue-950 rounded-3xl font-medium shadow-md"
        >
          <Plus className="w-5 h-5" /> Add New
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {institutes.map((inst) => (
          <InstituteCard key={inst.id} institute={inst} />
        ))}
      </div>

      {institutes.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <BookOpen className="w-16 h-16 text-blue-200 mx-auto mb-4" />
          <p className="text-gray-500">No institutes added yet</p>
        </div>
      )}

      {/* Sidebar Form */}
      <div
        className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 ${showForm ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <h2 className="text-xl font-bold">
              {editingInstitute ? "Edit Institute" : "Add New Institute"}
            </h2>
            <button onClick={() => setShowForm(false)} disabled={isUploading}>
              <X size={24} />
            </button>
          </div>
          <form
            onSubmit={handleSubmit}
            className="space-y-6 flex-1 overflow-y-auto"
          >
            <div>
              <label className="block text-sm font-semibold mb-2">
                Institute Title *
              </label>
              <input
                type="text"
                name="title"
                className="w-full p-3 border rounded-lg"
                value={formData.title}
                onChange={handleInputChange}
                disabled={isUploading}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Institute Logo *
              </label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  id="inst-upload"
                  hidden
                  onChange={handleImageChange}
                  accept="image/*"
                  disabled={isUploading}
                />
                {formData.imagePreview ? (
                  <div className="relative">
                    <img
                      src={formData.imagePreview}
                      className="max-h-48 mx-auto rounded-lg object-cover"
                      alt="Preview"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          imagePreview: null,
                          image: null,
                        })
                      }
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() =>
                      document.getElementById("inst-upload").click()
                    }
                    className="cursor-pointer"
                  >
                    <ImageIcon className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                    <p className="text-sm">Click to upload image</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 border rounded-lg"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-blue-400/30 text-blue-950 rounded-lg font-medium"
                disabled={isUploading}
              >
                {isUploading
                  ? "Saving..."
                  : editingInstitute
                    ? "Save Changes"
                    : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => !isUploading && setShowForm(false)}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md text-center">
            <Trash2 className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Confirm Delete</h3>
            <p className="mb-6">Delete "{editingInstitute?.title}"?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OurInstitutes;
