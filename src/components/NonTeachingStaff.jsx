"use client";
import { Trash2, Edit2, GripVertical, Plus, X } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

// Drag and Drop Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const API_URL = "http://localhost:5000/api/non-teaching-staff";

// --- Sortable Item Component ---
const SortableStaffCard = ({
  staff,
  hoveredCard,
  setHoveredCard,
  handleStarClick,
  handleEdit,
  handleDeleteClick,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: staff.id.toString() });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-all relative group"
      onMouseEnter={() => setHoveredCard(staff.id)}
      onMouseLeave={() => setHoveredCard(null)}
    >
      <div className="h-40 md:h-56 w-full overflow-hidden relative">
        <img
          src={staff.image}
          alt={staff.name}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <div
          className={`absolute top-3 right-3 cursor-pointer transition-all ${staff.is_featured ? "opacity-100" : hoveredCard === staff.id ? "opacity-100" : "opacity-40"}`}
          onClick={() => handleStarClick(staff.id)}
        >
          <svg
            className={`w-7 h-7 p-1 rounded-2xl ${staff.is_featured ? "bg-yellow-500 text-white" : "bg-white/80 text-black"}`}
            fill={staff.is_featured ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h2 className="text-lg font-semibold h-12 leading-snug">
          {staff.name}
        </h2>
        <p className="text-sm text-gray-500">{staff.designation}</p>
        <div className="mt-3 text-xs text-gray-700 space-y-1">
          <p>🎓 {staff.education}</p>
          <div className="flex justify-between items-center">
            <p>💼 {staff.experience}</p>

            {/* ACTION BUTTONS AREA */}
            <div className="flex gap-1 items-center">
              {/* Drag Handle Grouped with Edit/Delete */}
              <div
                {...attributes}
                {...listeners}
                className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded-lg"
                title="Drag to reorder"
              >
                <GripVertical size={16} />
              </div>

              <button
                onClick={() => handleEdit(staff)}
                className="p-1.5 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDeleteClick(staff.id)}
                className="p-1.5 text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NonTeachingStaffDashboard = () => {
  const [staffMembers, setStaffMembers] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStaff, setNewStaff] = useState({
    name: "",
    designation: "",
    education: "",
    experience: "",
    image: null,
    imagePreview: "",
    isFeatured: false,
  });
  const [editingId, setEditingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const fileInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchStaff = async () => {
    try {
      const res = await axios.get(API_URL);
      setStaffMembers(res.data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = staffMembers.findIndex(
        (s) => s.id.toString() === active.id,
      );
      const newIndex = staffMembers.findIndex(
        (s) => s.id.toString() === over.id,
      );

      const newItems = arrayMove(staffMembers, oldIndex, newIndex);
      setStaffMembers(newItems);

      const sequenceData = newItems.map((item, index) => ({
        id: item.id,
        sequence_order: index,
      }));

      try {
        await axios.post(`${API_URL}/reorder`, { sequence: sequenceData });
      } catch (error) {
        fetchStaff();
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewStaff((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewStaff((prev) => ({
          ...prev,
          image: file,
          imagePreview: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setNewStaff((prev) => ({ ...prev, image: null, imagePreview: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", newStaff.name);
    formData.append("designation", newStaff.designation);
    formData.append("education", newStaff.education);
    formData.append("experience", newStaff.experience);
    formData.append("isFeatured", newStaff.isFeatured);
    if (newStaff.image) formData.append("image", newStaff.image);

    try {
      if (isEditing) await axios.put(`${API_URL}/${editingId}`, formData);
      else await axios.post(API_URL, formData);
      fetchStaff();
      handleCancelEdit();
    } catch (err) {
      alert("Save failed");
    }
  };

  const handleEdit = (staff) => {
    setNewStaff({ ...staff, imagePreview: staff.image, image: null });
    setIsEditing(true);
    setEditingId(staff.id);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setShowForm(false);
    setNewStaff({
      name: "",
      designation: "",
      education: "",
      experience: "",
      image: null,
      imagePreview: "",
      isFeatured: false,
    });
  };

  const toggleFeatured = async (id) => {
    try {
      await axios.patch(`${API_URL}/${id}/featured`);
      fetchStaff();
    } catch (err) {}
  };

  const handleDeleteClick = (id) => {
    setStaffToDelete(staffMembers.find((s) => s.id === id));
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API_URL}/${staffToDelete.id}`);
      fetchStaff();
      setShowDeleteModal(false);
      setStaffToDelete(null);
    } catch (err) {
      alert("Delete failed");
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center">Loading Non-Teaching Staff...</div>
    );

  return (
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">
              Non-Teaching Staff ({staffMembers.length})
            </h1>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-400/30 text-blue-950 rounded-3xl font-medium transition duration-200 flex items-center"
            >
              <Plus size={20} className="mr-2" /> Add Staff
            </button>
          </div>
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={staffMembers.map((s) => s.id.toString())}
            strategy={rectSortingStrategy}
          >
            <div className="grid gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 mb-16">
              {staffMembers.map((staff) => (
                <SortableStaffCard
                  key={staff.id}
                  staff={staff}
                  hoveredCard={hoveredCard}
                  setHoveredCard={setHoveredCard}
                  handleStarClick={toggleFeatured}
                  handleEdit={handleEdit}
                  handleDeleteClick={handleDeleteClick}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay
            dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: { active: { opacity: "0.5" } },
              }),
            }}
          >
            {activeId ? (
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-60 opacity-90 scale-105">
                <img
                  src={
                    staffMembers.find((s) => s.id.toString() === activeId)
                      ?.image
                  }
                  className="h-40 w-full object-cover"
                  alt="dragging"
                />
                <div className="p-4">
                  <h2 className="font-semibold">
                    {
                      staffMembers.find((s) => s.id.toString() === activeId)
                        ?.name
                    }
                  </h2>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {showForm && (
          <>
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={handleCancelEdit}
            />
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {isEditing ? "Edit Staff" : "Add Staff"}
                </h2>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full"
                >
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div
                  className="mb-6 relative cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {newStaff.imagePreview ? (
                    <div className="relative aspect-square w-52 h-52 mx-auto rounded-xl overflow-hidden border-2 border-gray-200">
                      <img
                        src={newStaff.imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage();
                        }}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-square w-52 h-52 mx-auto rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 hover:bg-blue-50 transition-colors">
                      <p className="text-gray-500 text-sm">
                        Click to upload photo
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <input
                  type="text"
                  name="name"
                  value={newStaff.name}
                  onChange={handleInputChange}
                  placeholder="Full Name"
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  name="designation"
                  value={newStaff.designation}
                  onChange={handleInputChange}
                  placeholder="Designation"
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  name="education"
                  value={newStaff.education}
                  onChange={handleInputChange}
                  placeholder="Education"
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  name="experience"
                  value={newStaff.experience}
                  onChange={handleInputChange}
                  placeholder="Experience"
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 px-4 py-3 border rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-400/30 text-blue-950 rounded-lg font-medium"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl text-center">
              <h3 className="text-xl font-bold text-gray-800">
                Confirm Delete
              </h3>
              <p className="mb-6 text-gray-700">
                Delete{" "}
                <span className="font-semibold">{staffToDelete?.name}</span>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-3 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NonTeachingStaffDashboard;
