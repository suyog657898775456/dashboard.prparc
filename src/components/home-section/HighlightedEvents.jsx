"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Calendar,
  Clock,
  MapPin,
  Edit2,
  Trash2,
  Plus,
  X,
  Info,
  Link,
  GripVertical,
  Image as ImageIcon,
} from "lucide-react";

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
const API_URL = `${API_BASE_URL}/api/highlights`;

// --- Sortable Item Component ---
const SortableEventCard = ({
  event,
  handleEdit,
  setDeleteConfirm,
  formatDate,
}) => {
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
      className="bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative"
    >
      <img
        src={event.coverImage}
        className="w-full h-48 object-cover"
        alt={event.title}
      />
      <div className="p-4">
        <h3 className="font-bold text-gray-900 mb-2">{event.title}</h3>
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <Calendar size={14} /> {formatDate(event.date)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={14} /> {event.location}
          </span>
        </div>
        <div className="flex justify-end gap-2 items-center">
          {/* DRAG HANDLE GROUPED WITH ACTIONS */}
          <div
            {...attributes}
            {...listeners}
            className="p-2 bg-gray-50 text-gray-400 hover:text-gray-600 rounded-lg cursor-grab active:cursor-grabbing"
          >
            <GripVertical size={16} />
          </div>
          <button
            onClick={() => handleEdit(event)}
            className="p-2 bg-blue-50 text-blue-600 rounded-lg"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => setDeleteConfirm(event.id)}
            className="p-2 bg-red-50 text-red-600 rounded-lg"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const HighlightedEvents = () => {
  const [events, setEvents] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    description: "",
    coverImage: null,
    coverImagePreview: null,
    additionalImages: [],
    additionalImagesPreviews: [],
    videos: [],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [yearFilter, setYearFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newVideoLink, setNewVideoLink] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchHighlights = async () => {
    try {
      const res = await axios.get(API_URL);
      setEvents(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHighlights();
  }, []);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      const oldIndex = events.findIndex((e) => e.id.toString() === active.id);
      const newIndex = events.findIndex((e) => e.id.toString() === over.id);
      const newItems = arrayMove(events, oldIndex, newIndex);
      setEvents(newItems);

      const sequenceData = newItems.map((item, index) => ({
        id: item.id,
        sequence_order: index,
      }));
      try {
        await axios.post(`${API_URL}/reorder`, { sequence: sequenceData });
      } catch (error) {
        fetchHighlights();
      }
    }
  };

  const getAvailableYears = () => {
    const years = new Set();
    events.forEach((event) =>
      years.add(new Date(event.date).getFullYear().toString()),
    );
    return Array.from(years)
      .sort((a, b) => b - a)
      .slice(0, 5);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  const handleCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (file)
      setFormData({
        ...formData,
        coverImage: file,
        coverImagePreview: URL.createObjectURL(file),
      });
  };

  const handleAddVideoLink = () => {
    if (!newVideoLink.trim()) return;
    try {
      new URL(newVideoLink);
      setFormData({
        ...formData,
        videos: [...formData.videos, newVideoLink.trim()],
      });
      setNewVideoLink("");
    } catch (e) {
      alert("Invalid URL");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("date", formData.date);
    data.append("time", formData.time);
    data.append("location", formData.location);
    data.append("videos", JSON.stringify(formData.videos));
    if (formData.coverImage) data.append("coverImage", formData.coverImage);
    try {
      if (isEditing) await axios.put(`${API_URL}/${editId}`, data);
      else await axios.post(API_URL, data);
      fetchHighlights();
      resetForm();
      setShowForm(false);
    } catch (err) {
      alert("Save failed");
    }
  };

  const handleEdit = (event) => {
    setFormData({
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      description: event.description || "",
      coverImage: null,
      coverImagePreview: event.coverImage,
      additionalImages: [],
      additionalImagesPreviews: [],
      videos: event.videos || [],
    });
    setIsEditing(true);
    setEditId(event.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      title: "",
      date: "",
      time: "",
      location: "",
      description: "",
      coverImage: null,
      coverImagePreview: null,
      additionalImages: [],
      additionalImagesPreviews: [],
      videos: [],
    });
    setNewVideoLink("");
  };
  const confirmDelete = async () => {
    try {
      await axios.delete(`${API_URL}/${deleteConfirm}`);
      fetchHighlights();
      setDeleteConfirm(null);
    } catch (err) {
      alert("Delete failed");
    }
  };
  const formatDate = (ds) =>
    new Date(ds).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const filteredEvents =
    yearFilter === "all"
      ? events
      : events.filter(
          (e) => new Date(e.date).getFullYear().toString() === yearFilter,
        );

  if (loading)
    return (
      <div className="p-10 text-center font-bold">Loading Highlights...</div>
    );

  return (
    <div className="min-h-screen relative">
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            {["all", ...getAvailableYears()].map((year) => (
              <button
                key={year}
                onClick={() => setYearFilter(year)}
                className={`px-4 py-1 rounded-full text-sm font-medium ${yearFilter === year ? "bg-blue-600 text-white" : "bg-gray-100"}`}
              >
                {year.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-6 py-2 bg-blue-400/30 text-blue-950 font-medium rounded-3xl hover:bg-blue-400/40 flex items-center shadow-sm"
          >
            <Plus size={20} /> Add New Event
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredEvents.map((e) => e.id.toString())}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
              {filteredEvents.map((event) => (
                <SortableEventCard
                  key={event.id}
                  event={event}
                  handleEdit={handleEdit}
                  setDeleteConfirm={setDeleteConfirm}
                  formatDate={formatDate}
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
              <div className="bg-white border rounded-2xl overflow-hidden shadow-2xl w-full max-w-[500px] border-blue-400 opacity-90 scale-105 pointer-events-none">
                <img
                  src={
                    events.find((e) => e.id.toString() === activeId)?.coverImage
                  }
                  className="w-full h-48 object-cover"
                  alt=""
                />
                <div className="p-4 font-bold">
                  {events.find((e) => e.id.toString() === activeId)?.title}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Side Form Logic remains same */}
      <div
        className={`fixed inset-y-0 right-0 w-full lg:w-[450px] bg-white shadow-2xl transform transition-transform duration-300 z-50 overflow-y-auto ${showForm ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              {isEditing ? "Edit Highlight" : "New Highlight"}
            </h2>
            <button onClick={() => setShowForm(false)}>
              <X />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-xl"
              placeholder="Event Title"
              required
            />
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-xl"
              rows="3"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="p-3 border rounded-xl"
                required
              />
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                className="p-3 border rounded-xl"
                required
              />
            </div>
            <input
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-xl"
              placeholder="Location"
              required
            />
            <div
              className="border-2 border-dashed rounded-2xl p-4 text-center relative bg-gray-50"
              onClick={() =>
                !formData.coverImagePreview &&
                document.getElementById("highlightCover").click()
              }
            >
              {formData.coverImagePreview ? (
                <div className="relative">
                  <img
                    src={formData.coverImagePreview}
                    className="w-full h-40 object-cover rounded-xl"
                    alt=""
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        coverImagePreview: null,
                        coverImage: null,
                      })
                    }
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <div className="py-8">
                  <ImageIcon className="mx-auto text-blue-500 mb-2" />
                  <p className="text-sm">Upload Cover Image</p>
                </div>
              )}
              <input
                type="file"
                id="highlightCover"
                hidden
                onChange={handleCoverImageChange}
                accept="image/*"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={newVideoLink}
                onChange={(e) => setNewVideoLink(e.target.value)}
                placeholder="Video URL"
                className="flex-1 p-3 border rounded-xl"
              />
              <button
                type="button"
                onClick={handleAddVideoLink}
                className="bg-blue-600 text-white px-4 rounded-xl"
              >
                <Link size={18} />
              </button>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
              >
                {isEditing ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <Trash2 className="mx-auto text-red-600 mb-4" size={48} />
            <h3 className="font-bold mb-2">Delete Event?</h3>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 border rounded-lg"
              >
                No
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HighlightedEvents;
