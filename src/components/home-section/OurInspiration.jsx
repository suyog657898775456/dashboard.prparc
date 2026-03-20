"use client";
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Users, Award, Edit2, User, X, Trash2 } from "lucide-react";

const API_URL = "http://localhost:5000/api/authorities";

const OurInspiration = () => {
  const [inspiration, setInspiration] = useState({
    name: "",
    desc: "",
    image: null,
  });
  const [pillars, setPillars] = useState([]);
  const [principal, setPrincipal] = useState({
    name: "",
    role: "",
    desc: "",
    image: null,
  });
  const [loading, setLoading] = useState(true);

  // UI States
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("inspiration");
  const [formType, setFormType] = useState("inspiration");
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    desc: "",
    image: null,
    file: null,
  });
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [charCount, setCharCount] = useState(0);
  const fileInputRef = useRef(null);

  // --- BACKEND LOGIC ---
  const fetchData = async () => {
    try {
      const res = await axios.get(API_URL);
      const data = res.data;
      setInspiration(
        data.find((i) => i.category === "inspiration") || {
          name: "Not Set",
          desc: "",
        },
      );
      setPillars(data.filter((i) => i.category === "pillar"));
      setPrincipal(
        data.find((i) => i.category === "principal") || {
          name: "Not Set",
          role: "Principal",
          desc: "",
        },
      );
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("id", editingId);
    data.append("category", formType);
    data.append("name", formData.name);
    data.append("role", formData.role);
    data.append("desc", formData.desc);
    if (formData.file) data.append("image", formData.file);

    try {
      await axios.post(API_URL, data);
      fetchData();
      handleClose();
    } catch (err) {
      alert("Save failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchData();
      setDeleteConfirm(null);
    } catch (err) {
      alert("Delete failed");
    }
  };
  // --- END BACKEND LOGIC ---

  const updateFormData = (newData) => {
    setFormData(newData);
    setCharCount(newData.desc ? newData.desc.length : 0);
  };

  const handleDescChange = (e) => {
    const input = e.target.value;
    if (input.length <= 150) updateFormData({ ...formData, desc: input });
  };

  const handleOpenInspiration = () => {
    setFormType("inspiration");
    setEditMode(true);
    setEditingId(inspiration.id);
    updateFormData({
      name: inspiration.name,
      role: "",
      desc: inspiration.desc,
      image: inspiration.image,
      file: null,
    });
    setIsOpen(true);
  };

  const handleOpenPillars = (mode = "add", pillar = null) => {
    setFormType("pillar");
    setEditMode(mode === "edit");
    if (mode === "edit" && pillar) {
      setEditingId(pillar.id);
      updateFormData({
        name: pillar.name,
        role: pillar.role || "",
        desc: pillar.desc,
        image: pillar.image,
        file: null,
      });
    } else {
      setEditingId(null);
      updateFormData({ name: "", role: "", desc: "", image: null, file: null });
    }
    setIsOpen(true);
  };

  const handleOpenPrincipal = () => {
    setFormType("principal");
    setEditMode(true);
    setEditingId(principal.id);
    updateFormData({
      name: principal.name,
      role: principal.role,
      desc: principal.desc,
      image: principal.image,
      file: null,
    });
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    updateFormData({ name: "", role: "", desc: "", image: null, file: null });
    setEditingId(null);
    setEditMode(false);
  };

  const getFormTitle = () => {
    if (formType === "inspiration") return "Edit Inspiration";
    if (formType === "pillar")
      return editMode ? "Edit Pillar" : "Add New Pillar";
    return "Edit Principal";
  };

  if (loading)
    return <div className="p-10 text-center">Loading Authorities...</div>;

  const renderFormContent = () => (
    <div className="space-y-6">
      <div
        onClick={() => fileInputRef.current.click()}
        className="w-52 h-60 border-2 border-dashed border-gray-300 rounded-xl mx-auto flex items-center justify-center cursor-pointer bg-gray-50 group relative overflow-hidden"
      >
        {formData.image ? (
          <img
            src={formData.image}
            className="w-full h-full object-cover"
            alt="preview"
          />
        ) : (
          <div className="text-center text-gray-400 flex flex-col items-center">
            <User size={80} className="text-gray-200" />
            <span className="text-[10px] font-bold mt-2 uppercase tracking-widest">
              Click to Upload
            </span>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file)
              updateFormData({
                ...formData,
                file: file,
                image: URL.createObjectURL(file),
              });
          }}
        />
      </div>
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-bold text-gray-600">Name</span>
          <input
            required
            className="w-full mt-1 border rounded-lg p-3 outline-none"
            value={formData.name}
            onChange={(e) =>
              updateFormData({ ...formData, name: e.target.value })
            }
          />
        </label>
        {(formType === "pillar" || formType === "principal") && (
          <label className="block">
            <span className="text-sm font-bold text-gray-600">Designation</span>
            <input
              required
              className="w-full mt-1 border rounded-lg p-3 outline-none"
              value={formData.role}
              onChange={(e) =>
                updateFormData({ ...formData, role: e.target.value })
              }
            />
          </label>
        )}
        <label className="block">
          <span className="text-sm font-bold text-gray-600">Description</span>
          <textarea
            required
            rows="6"
            className={`w-full mt-1 border rounded-lg p-3 outline-none resize-none ${charCount > 150 ? "border-red-500" : "border-gray-200"}`}
            value={formData.desc}
            onChange={handleDescChange}
          />
          <div className="text-right text-xs text-gray-500 mt-1">
            {charCount}/150
          </div>
        </label>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex border-b border-gray-200 mb-10">
          {[
            {
              id: "inspiration",
              label: "Our Inspiration",
              icon: <Star size={20} />,
            },
            { id: "pillars", label: "Our Pillars", icon: <Users size={20} /> },
            {
              id: "principal",
              label: "Our Principal",
              icon: <Award size={20} />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 text-lg font-bold transition-colors flex items-center justify-center gap-3 ${activeTab === tab.id ? "text-orange-500 border-b-4 border-orange-500" : "text-gray-500 hover:bg-gray-50"}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {activeTab === "inspiration" && (
            <div className="flex flex-col items-center">
              <div className="w-full flex items-center mb-8">
                <h2 className="text-orange-500 text-2xl font-bold mr-2">
                  Our Inspiration
                </h2>
                <button
                  onClick={handleOpenInspiration}
                  className="p-2 bg-blue-200 text-blue-600 rounded-full"
                >
                  <Edit2 size={16} />
                </button>
              </div>
              <div className="w-60 h-72 rounded-3xl shadow-2xl overflow-hidden mb-8 bg-gray-200 flex items-center justify-center">
                {inspiration.image ? (
                  <img
                    src={inspiration.image}
                    className="w-full h-full object-cover"
                    alt="profile"
                  />
                ) : (
                  <User size={80} className="text-gray-400" />
                )}
              </div>
              <div className="text-center max-w-sm">
                <h3 className="text-orange-600 text-2xl font-semibold mb-2">
                  {inspiration.name}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {inspiration.desc}
                </p>
              </div>
            </div>
          )}

          {activeTab === "pillars" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-orange-500 text-2xl font-bold">
                  Our Pillars
                </h2>
                <button
                  onClick={() => handleOpenPillars("add")}
                  className="px-4 py-2 bg-blue-400/30 text-blue-950 rounded-xl font-medium"
                >
                  Add Pillar
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pillars.map((p) => (
                  <div
                    key={p.id}
                    className="flex rounded-2xl overflow-hidden shadow-lg h-48 bg-white border border-gray-100 relative"
                  >
                    <div className="w-1/3 bg-gray-100 flex items-center justify-center">
                      {p.image ? (
                        <img
                          src={p.image}
                          className="w-full h-full object-cover"
                          alt="profile"
                        />
                      ) : (
                        <User size={40} className="text-gray-300" />
                      )}
                    </div>
                    <div className="w-2/3 p-6 bg-gradient-to-r from-[#fde68a] to-[#86efac]">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {p.name}
                      </h3>
                      <p className="font-semibold text-xs uppercase text-gray-800">
                        {p.role}
                      </p>
                      <p className="text-[11px] text-gray-800 mt-3 line-clamp-3">
                        {p.desc}
                      </p>
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <button
                          onClick={() => handleOpenPillars("edit", p)}
                          className="p-2 bg-blue-200 text-blue-600 rounded-2xl"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(p.id)}
                          className="p-2 bg-red-200 text-red-600 rounded-2xl"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "principal" && (
            <div className="flex flex-col items-center">
              <h2 className="text-orange-500 text-2xl font-bold mb-8 w-full">
                Our Principal
              </h2>
              <div className="flex rounded-2xl w-full max-w-[500px] overflow-hidden shadow-lg h-48 bg-white border border-gray-100 relative">
                <div className="w-1/3 bg-gray-100 flex items-center justify-center">
                  {principal.image ? (
                    <img
                      src={principal.image}
                      className="w-full h-full object-cover"
                      alt="principal"
                    />
                  ) : (
                    <User size={40} className="text-gray-300" />
                  )}
                </div>
                <div className="w-2/3 p-6 bg-gradient-to-r from-[#fde68a] to-[#86efac]">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {principal.name}
                  </h3>
                  <p className="font-semibold text-xs uppercase text-gray-800">
                    {principal.role}
                  </p>
                  <p className="text-[11px] text-gray-800 mt-3 line-clamp-3">
                    {principal.desc}
                  </p>
                  <button
                    onClick={handleOpenPrincipal}
                    className="absolute bottom-4 right-4 p-2 bg-blue-200 text-blue-600 rounded-2xl"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-bold">{getFormTitle()}</h2>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-200 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              <form
                onSubmit={handleSubmit}
                className="p-6 flex-1 overflow-y-auto flex flex-col"
              >
                {renderFormContent()}
                <div className="flex gap-3 pt-6 border-t mt-auto">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-3 border rounded-xl text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-blue-400/30 text-blue-950 rounded-xl font-medium"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
            <Trash2 className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg"
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

export default OurInspiration;
