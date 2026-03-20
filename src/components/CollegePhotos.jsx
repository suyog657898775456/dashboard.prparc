"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Upload,
  XCircle,
  Info,
  GripVertical,
} from "lucide-react";
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

// Backend Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_BASE = `${API_BASE_URL}/api/photos`;
const BACKEND_URL = API_BASE_URL;
// --- Sortable Item Component ---
const SortablePhotoCard = ({ photo, handleEdit, confirmDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id.toString() });

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
      className="flex flex-col border w-64 h-80 border-gray-200 rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white"
    >
      <div className="relative aspect-video w-full h-52 overflow-hidden bg-gray-100 group">
        <img
          src={photo.imageUrl}
          alt={photo.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <p className="text-sm font-bold text-gray-800 mb-3 line-clamp-2 flex-1">
          {photo.title}
        </p>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center text-gray-700">
            <Calendar className="w-4 h-4 mr-2 text-blue-500" />
            <span className="text-xs font-semibold">{photo.date}</span>
          </div>
          <div className="flex gap-1 items-center">
            {/* DRAG HANDLE */}
            <div
              {...attributes}
              {...listeners}
              className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded-2xl"
            >
              <GripVertical size={14} />
            </div>
            <button
              onClick={() => handleEdit(photo)}
              className="p-1.5 text-blue-600 bg-blue-200 hover:bg-blue-100 rounded-2xl"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => confirmDelete(photo)}
              className="p-1.5 text-red-600 bg-red-200 hover:bg-red-100 rounded-2xl"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CollegePhotos = () => {
  const [activeYear, setActiveYear] = useState("All");
  const [activeId, setActiveId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [photoData, setPhotoData] = useState({
    title: "",
    date: "",
    year: "2025",
    imageUrl: "",
    imagePreview: "",
    imageFile: null,
  });

  const [photosByYear, setPhotosByYear] = useState({});
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_BASE);
      const data = response.data;
      const grouped = data.reduce((acc, photo) => {
        const year = new Date(photo.event_date).getFullYear().toString();
        if (!acc[year]) acc[year] = [];
        acc[year].push({
          id: photo.id,
          title: photo.title,
          imageUrl: photo.image_url.startsWith("http")
            ? photo.image_url
            : `${BACKEND_URL}${photo.image_url}`,
          date: formatDateForDisplay(photo.event_date),
          rawDate: photo.event_date,
          sequence_order: photo.sequence_order,
        });
        return acc;
      }, {});
      setPhotosByYear(grouped);
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const currentList = getCurrentPhotos();
      const oldIndex = currentList.findIndex(
        (p) => p.id.toString() === active.id,
      );
      const newIndex = currentList.findIndex(
        (p) => p.id.toString() === over.id,
      );

      const newItems = arrayMove(currentList, oldIndex, newIndex);

      // Re-map sequence orders
      const sequenceData = newItems.map((item, index) => ({
        id: item.id,
        sequence_order: index,
      }));

      try {
        await axios.post(`${API_BASE}/reorder`, { sequence: sequenceData });
        fetchPhotos();
      } catch (error) {
        console.error("Failed to update sequence:", error);
      }
    }
  };

  const getCurrentPhotos = () => {
    if (activeYear === "All") {
      const all = [];
      Object.keys(photosByYear).forEach((year) => {
        all.push(...photosByYear[year].map((p) => ({ ...p, year })));
      });
      return all.sort(
        (a, b) => (a.sequence_order || 0) - (b.sequence_order || 0),
      );
    }
    return photosByYear[activeYear] || [];
  };

  const currentPhotos = getCurrentPhotos();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("title", photoData.title.trim());
    data.append("date", photoData.date);
    if (photoData.imageFile) data.append("image", photoData.imageFile);

    try {
      const url = editingId ? `${API_BASE}/${editingId}` : API_BASE;
      const method = editingId ? "put" : "post";
      await axios[method](url, data);
      fetchPhotos();
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_BASE}/${photoToDelete.id}`);
      fetchPhotos();
      setShowDeleteModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () =>
        setPhotoData((prev) => ({
          ...prev,
          imageFile: file,
          imagePreview: reader.result,
        }));
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (photo) => {
    setPhotoData({
      title: photo.title,
      date: formatDateForInput(photo.rawDate || photo.date),
      imageUrl: photo.imageUrl,
      imagePreview: photo.imageUrl,
    });
    setEditingId(photo.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setPhotoData({
      title: "",
      date: "",
      year: "2025",
      imageUrl: "",
      imagePreview: "",
      imageFile: null,
    });
    setEditingId(null);
  };

  const formatDateForInput = (d) =>
    d ? new Date(d).toISOString().split("T")[0] : "";
  const formatDateForDisplay = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";
  const getAllTabCount = () =>
    Object.values(photosByYear).reduce((t, arr) => t + arr.length, 0);

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 md:py-8">
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-xl sm:text-3xl font-extrabold text-gray-800 tracking-wider">
            College Photos
          </h1>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center space-x-2 bg-blue-400/30 text-blue-950 font-medium px-6 py-3 rounded-3xl hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Add New </span>
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-8">
          {["All", "2026", "2025", "2024", "2023"].map((tab) => {
            const count =
              tab === "All" ? getAllTabCount() : photosByYear[tab]?.length || 0;
            return (
              <button
                key={tab}
                onClick={() => setActiveYear(tab)}
                className={`px-6 md:px-8 py-2 text-sm my-1 rounded-3xl font-semibold transition-all ${activeYear === tab ? "bg-blue-400/30 text-blue-950 shadow-lg" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                {tab}{" "}
                {count === 0 && tab !== "All" && (
                  <span className="ml-2 text-xs opacity-75">(Empty)</span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={currentPhotos.map((p) => p.id.toString())}
          strategy={rectSortingStrategy}
        >
          <section className="grid justify-items-center grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {currentPhotos.map((photo) => (
              <SortablePhotoCard
                key={photo.id}
                photo={photo}
                handleEdit={handleEdit}
                confirmDelete={setPhotoToDelete}
              />
            ))}
          </section>
        </SortableContext>

        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: { active: { opacity: "0.5" } },
            }),
          }}
        >
          {activeId ? (
            <div className="flex flex-col border w-64 h-80 border-blue-400 rounded-lg overflow-hidden shadow-2xl bg-white opacity-90 scale-105 pointer-events-none">
              <div className="relative aspect-video w-full h-52 overflow-hidden bg-gray-100">
                <img
                  src={
                    currentPhotos.find((p) => p.id.toString() === activeId)
                      ?.imageUrl
                  }
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
              <div className="p-5 flex-1 font-bold text-sm text-gray-800">
                {currentPhotos.find((p) => p.id.toString() === activeId)?.title}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Slide-over Form Panel and Delete Modal remain same as original logic */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setShowForm(false)}
          />
          <div className="absolute inset-y-0 right-0 flex max-w-full transition-transform duration-300 translate-x-0">
            <div className="relative w-screen sm:max-w-lg h-full bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-xl font-semibold text-gray-700">
                  {editingId ? "Edit Photo" : "Add New Photo"}
                </h2>
                <button onClick={() => setShowForm(false)}>
                  <XCircle className="h-6 w-6 text-gray-400" />
                </button>
              </div>
              <form
                onSubmit={handleSubmit}
                className="flex-1 overflow-y-auto p-6 space-y-6"
              >
                <input
                  type="text"
                  name="title"
                  value={photoData.title}
                  onChange={(e) =>
                    setPhotoData({ ...photoData, title: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg"
                  placeholder="Photo Title"
                  required
                />
                <input
                  type="date"
                  name="date"
                  value={photoData.date}
                  onChange={(e) =>
                    setPhotoData({ ...photoData, date: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg"
                  required
                />
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer"
                  onClick={() => document.getElementById("img-up").click()}
                >
                  {photoData.imagePreview ? (
                    <img
                      src={photoData.imagePreview}
                      className="w-full h-48 object-cover rounded-lg"
                      alt=""
                    />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="text-blue-500 mb-2" />
                      <span className="text-sm">Click to upload</span>
                    </div>
                  )}
                  <input
                    type="file"
                    id="img-up"
                    hidden
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-3 border rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-blue-400/30 text-blue-950 font-bold rounded-lg"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal ||
        (photoToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setPhotoToDelete(null)}
            />
            <div className="relative bg-white rounded-lg p-6 text-center max-w-sm w-full shadow-2xl">
              <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">Delete Photo?</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => setPhotoToDelete(null)}
                  className="flex-1 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

export default CollegePhotos;
