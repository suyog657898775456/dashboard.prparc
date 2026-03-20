"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import {
  Calendar,
  MapPin,
  Plus,
  X,
  AlertTriangle,
  Trash2,
  GripVertical,
  Edit2,
} from "lucide-react";
import { motion } from "framer-motion";

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

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${API_BASE_URL}/api/college-tours`;
// --- Sortable Item Component ---
const SortableEventCard = ({ event, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id.toString() });

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
      className="bg-white rounded-2xl shadow-lg overflow-hidden w-64 h-full flex flex-col group border border-gray-100 relative"
    >
      <div className="relative pt-[70%]">
        <img
          src={event.images[0]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <div className="pt-6 px-6 flex-1">
        <h3 className="text-sm font-bold line-clamp-2">{event.title}</h3>
        <p className="text-gray-600 text-xs mt-2 line-clamp-2">
          {event.description}
        </p>
        <div className="mt-4 space-y-2 text-xs font-medium">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-orange-500" />{" "}
            {new Date(event.date).toLocaleDateString()}
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-red-500" /> {event.location}
          </div>
        </div>
      </div>
      <div className="p-2 flex justify-end gap-2 items-center">
        {/* DRAG HANDLE GROUPED WITH ACTIONS */}
        <div
          {...attributes}
          {...listeners}
          className="p-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded-full transition-colors"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(event);
          }}
          className="p-2 bg-blue-200 rounded-full hover:bg-blue-300"
        >
          <Edit2 className="w-4 h-4 text-blue-600" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(event.id);
          }}
          className="p-2 bg-red-200 rounded-full hover:bg-red-300"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>
    </div>
  );
};

const CollegeTourDashboard = () => {
  const [tours, setTours] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [newTour, setNewTour] = useState({
    title: "",
    description: "",
    location: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [formImages, setFormImages] = useState({
    main: null,
    mainFile: null,
    additional: [],
  });
  const [formVideos, setFormVideos] = useState([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    tourId: null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchTours = async () => {
    try {
      const res = await axios.get(API_URL);
      setTours(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = tours.findIndex((t) => t.id.toString() === active.id);
      const newIndex = tours.findIndex((t) => t.id.toString() === over.id);

      const newItems = arrayMove(tours, oldIndex, newIndex);
      setTours(newItems);

      const sequenceData = newItems.map((item, index) => ({
        id: item.id,
        sequence_order: index,
      }));

      try {
        await axios.post(`${API_URL}/reorder`, { sequence: sequenceData });
      } catch (error) {
        console.error("Failed to update sequence:", error);
        fetchTours(); // Revert on failure
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("id", editingId);
    data.append("title", newTour.title);
    data.append("description", newTour.description);
    data.append("location", newTour.location);
    data.append("date", newTour.date);
    data.append("videos", JSON.stringify(formVideos));

    if (formImages.mainFile) data.append("images", formImages.mainFile);
    formImages.additional.forEach((item) => {
      if (item.file) data.append("images", item.file);
    });

    try {
      await axios.post(API_URL, data);
      fetchTours();
      handleCloseForm();
    } catch (err) {
      alert("Save failed");
    }
  };

  const executeDelete = async () => {
    try {
      await axios.delete(`${API_URL}/${deleteConfirmation.tourId}`);
      fetchTours();
      setDeleteConfirmation({ isOpen: false, tourId: null });
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleImageChange = (e, type) => {
    const files = Array.from(e.target.files);
    if (type === "main") {
      setFormImages((p) => ({
        ...p,
        main: URL.createObjectURL(files[0]),
        mainFile: files[0],
      }));
    } else {
      const newAdds = files.map((f) => ({
        preview: URL.createObjectURL(f),
        file: f,
      }));
      setFormImages((p) => ({
        ...p,
        additional: [...p.additional, ...newAdds],
      }));
    }
  };

  const handleEdit = (tour) => {
    setNewTour({
      title: tour.title,
      description: tour.description,
      location: tour.location,
      date: tour.date,
    });
    setFormImages({
      main: tour.images[0],
      mainFile: null,
      additional: tour.images
        .slice(1)
        .map((img) => ({ preview: img, file: null })),
    });
    setFormVideos(tour.videos || []);
    setEditingId(tour.id);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setEditingId(null);
    setNewTour({
      title: "",
      description: "",
      location: "",
      date: new Date().toISOString().split("T")[0],
    });
    setFormImages({ main: null, mainFile: null, additional: [] });
    setFormVideos([]);
    setShowForm(false);
  };

  const availableYears = useMemo(
    () =>
      [
        "all",
        ...new Set(tours.map((t) => new Date(t.date).getFullYear().toString())),
      ].sort((a, b) => b - a),
    [tours],
  );
  const filteredTours = useMemo(
    () =>
      activeTab === "all"
        ? tours
        : tours.filter(
            (t) => new Date(t.date).getFullYear().toString() === activeTab,
          ),
    [tours, activeTab],
  );

  if (loading)
    return <div className="p-10 text-center font-bold">Loading Tours...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-3xl font-bold">College Tour</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-400/30 text-blue-950 px-6 py-3 rounded-3xl font-medium flex items-center gap-2"
        >
          <Plus size={20} /> Add New
        </button>
      </header>

      <div className="max-w-6xl mx-auto flex gap-2 mb-8 overflow-x-auto pb-2">
        {availableYears.map((year) => (
          <button
            key={year}
            onClick={() => setActiveTab(year)}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === year ? "bg-blue-400/30 text-blue-950 shadow-md" : "bg-gray-100"}`}
          >
            {year === "all" ? "All" : year}
          </button>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredTours.map((t) => t.id.toString())}
          strategy={rectSortingStrategy}
        >
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredTours.map((tour) => (
              <SortableEventCard
                key={tour.id}
                event={tour}
                onEdit={handleEdit}
                onDelete={(id) =>
                  setDeleteConfirmation({ isOpen: true, tourId: id })
                }
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
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-64 border-2 border-blue-400 opacity-90 scale-105 pointer-events-none">
              <div className="relative pt-[70%]">
                <img
                  src={
                    tours.find((t) => t.id.toString() === activeId)?.images[0]
                  }
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <div className="p-6 font-bold text-sm">
                {tours.find((t) => t.id.toString() === activeId)?.title}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Delete Confirmation */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full text-center">
            <AlertTriangle className="text-red-500 w-12 h-12 mx-auto mb-4" />
            <h3 className="text-xl font-bold">Delete Tour?</h3>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setDeleteConfirmation({ isOpen: false })}
                className="flex-1 py-3 bg-gray-100 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side Panel Form */}
      <div
        className={`fixed inset-0 z-50 transition-all ${showForm ? "opacity-100 visible" : "opacity-0 invisible"}`}
      >
        <div
          className="absolute inset-0 bg-black/50"
          onClick={handleCloseForm}
        />
        <div
          className={`absolute inset-y-0 right-0 w-full sm:w-96 bg-white shadow-xl transform transition-transform duration-300 ${showForm ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="h-full flex flex-col p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {editingId ? "Edit" : "Add New"} Tour
              </h2>
              <button onClick={handleCloseForm}>
                <X size={24} />
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto space-y-6"
            >
              <input
                placeholder="Title"
                className="w-full p-3 border rounded-xl"
                value={newTour.title}
                onChange={(e) =>
                  setNewTour({ ...newTour, title: e.target.value })
                }
                required
              />
              <textarea
                placeholder="Description"
                className="w-full p-3 border rounded-xl"
                value={newTour.description}
                onChange={(e) =>
                  setNewTour({ ...newTour, description: e.target.value })
                }
                rows="3"
                required
              />
              <input
                placeholder="Location"
                className="w-full p-3 border rounded-xl"
                value={newTour.location}
                onChange={(e) =>
                  setNewTour({ ...newTour, location: e.target.value })
                }
                required
              />
              <input
                type="date"
                className="w-full p-3 border rounded-xl"
                value={newTour.date}
                onChange={(e) =>
                  setNewTour({ ...newTour, date: e.target.value })
                }
                required
              />

              <div
                className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer"
                onClick={() => document.getElementById("mainImg").click()}
              >
                {formImages.main ? (
                  <img
                    src={formImages.main}
                    className="h-32 mx-auto rounded-lg object-cover"
                  />
                ) : (
                  "Upload Cover Image"
                )}
                <input
                  id="mainImg"
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, "main")}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-400/30 py-3 rounded-xl font-bold mt-4"
              >
                Save Tour
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollegeTourDashboard;
