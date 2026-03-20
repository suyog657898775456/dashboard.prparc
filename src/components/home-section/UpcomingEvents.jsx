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

const API_URL = "http://localhost:5000/api/events";

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
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden w-full max-w-[280px] h-[360px] flex flex-col group border border-gray-100"
    >
      <div className="relative h-44 w-full overflow-hidden bg-gray-100">
        <img
          src={event.coverImage || "/assets/college-gate.jpg"}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-sm font-bold text-gray-900 mb-3 line-clamp-2 leading-tight">
          {event.title}
        </h3>
        <div className="space-y-2.5 mt-auto text-[12px] font-medium text-gray-600">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-3 text-orange-500" />
            <span>{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-3 text-teal-500" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center flex-1 min-w-0">
              <MapPin className="w-4 h-4 mr-3 text-red-500" />
              <span className="truncate">{event.location}</span>
            </div>
            <div className="flex gap-2 items-center ml-2">
              {/* DRAG HANDLE */}
              <div
                {...attributes}
                {...listeners}
                className="p-1.5 bg-white text-gray-400 hover:text-gray-600 rounded-full shadow-sm cursor-grab active:cursor-grabbing border border-gray-50"
              >
                <GripVertical size={14} />
              </div>
              <button
                onClick={() => handleEdit(event)}
                className="p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => setDeleteConfirm(event.id)}
                className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const UpcomingEvents = () => {
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
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchEvents = async () => {
    try {
      const res = await axios.get(API_URL);
      setEvents(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Fetch error", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      const oldIndex = events.findIndex((e) => e.id.toString() === active.id);
      const newIndex = events.findIndex((e) => e.id.toString() === over.id);
      const newItems = arrayMove(events, oldIndex, newIndex);
      setEvents(newItems);
      try {
        await axios.post(`${API_URL}/reorder`, {
          sequence: newItems.map((item, index) => ({
            id: item.id,
            sequence_order: index,
          })),
        });
      } catch (error) {
        fetchEvents();
      }
    }
  };

  // UI logic Handlers
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("title", formData.title);
    data.append("date", formData.date);
    data.append("time", formData.time);
    data.append("location", formData.location);
    data.append("description", formData.description);
    if (formData.coverImage) data.append("coverImage", formData.coverImage);
    try {
      if (isEditing) await axios.put(`${API_URL}/${editId}`, data);
      else await axios.post(API_URL, data);
      fetchEvents();
      setShowForm(false);
      resetForm();
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
    });
  };
  const confirmDelete = async () => {
    try {
      await axios.delete(`${API_URL}/${deleteConfirm}`);
      fetchEvents();
      setDeleteConfirm(null);
    } catch (err) {
      alert("Delete failed");
    }
  };
  const formatDate = (ds) =>
    ds
      ? new Date(ds).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";

  if (loading)
    return <div className="p-10 text-center font-bold">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50/30">
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <Trash2 className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold">Delete Event?</h3>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-6 py-2 border rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Upcoming Events</h1>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-6 py-2 bg-blue-400/30 text-blue-950 font-medium rounded-3xl hover:bg-blue-400/40 flex items-center shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" /> Add Event
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => setActiveId(e.active.id)}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={events.map((e) => e.id.toString())}
            strategy={rectSortingStrategy}
          >
            {/* Standardized Grid Layout for 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-12 justify-items-center">
              {events.map((event) => (
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
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-[280px] border-2 border-blue-500 opacity-90 scale-105 pointer-events-none">
                <div className="h-44 w-full overflow-hidden">
                  <img
                    src={
                      events.find((e) => e.id.toString() === activeId)
                        ?.coverImage || "/assets/college-gate.jpg"
                    }
                    className="w-full h-full object-cover"
                    alt="dragging"
                  />
                </div>
                <div className="p-5 font-bold text-sm">
                  {events.find((e) => e.id.toString() === activeId)?.title}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full lg:w-[450px] bg-white shadow-2xl transform transition-transform duration-300 z-50 p-8 overflow-y-auto translate-x-0">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                {isEditing ? "Update" : "Create"} Event
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                placeholder="Title"
                required
              />
              <div className="flex gap-4">
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-1/2 p-3 border border-gray-200 rounded-xl outline-none"
                  required
                />
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className="w-1/2 p-3 border border-gray-200 rounded-xl outline-none"
                  required
                />
              </div>
              <input
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-200 rounded-xl outline-none"
                placeholder="Venue"
                required
              />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-200 rounded-xl h-32 outline-none"
                placeholder="Details..."
              />
              <div
                className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors bg-gray-50"
                onClick={() =>
                  document.getElementById("coverImageUpload").click()
                }
              >
                {formData.coverImagePreview ? (
                  <img
                    src={formData.coverImagePreview}
                    className="max-h-48 mx-auto rounded-xl object-cover w-full shadow-md"
                    alt=""
                  />
                ) : (
                  <div className="text-gray-400 py-4">
                    <ImageIcon className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm font-semibold">Upload Header Image</p>
                  </div>
                )}
                <input
                  type="file"
                  id="coverImageUpload"
                  hidden
                  accept="image/*"
                  onChange={handleCoverImageChange}
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all mt-4"
              >
                Save Configuration
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default UpcomingEvents;
