"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import {
  Calendar,
  MapPin,
  Clock,
  Edit2,
  Trash2,
  Star,
  Image as ImageIcon,
  Video,
  X,
  Plus,
  GripVertical,
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

const API_URL = "http://localhost:5000/api/academic-events";

// --- Sortable Item Component ---
const SortableEventCard = ({
  event,
  toggleEventHighlight,
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
      className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden w-64 h-full flex flex-col group border border-gray-200 relative"
    >
      <button
        onClick={() => toggleEventHighlight(event.id)}
        className="absolute top-3 right-3 z-10 p-2 bg-white/90 rounded-full shadow-md hover:scale-110 transition-transform"
      >
        <Star
          className={`w-5 h-5 ${event.isHighlighted ? "fill-yellow-500 text-yellow-500" : "text-gray-400"}`}
        />
      </button>
      <div className="relative overflow-hidden pt-[60%] w-full">
        <img
          src={event.coverImage}
          alt={event.title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="pt-6 pl-6 pr-6 flex-1 flex flex-col">
        <h3 className="text-sm font-bold text-gray-900 mb-3 line-clamp-2">
          {event.title}
        </h3>
        <p className="text-gray-600 text-xs mb-4 line-clamp-2 flex-1">
          {event.description}
        </p>
        <div className="space-y-3 mt-auto pb-4 text-xs font-medium">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-3 text-orange-500" />{" "}
            {formatDate(event.date)}
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-3 text-teal-500" /> {event.time}
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-3 text-red-500" /> {event.location}
          </div>
        </div>
      </div>
      <div className="flex justify-end pb-2 pr-2 gap-2 items-center">
        {/* DRAG HANDLE GROUPED WITH ACTIONS */}
        <div
          {...attributes}
          {...listeners}
          className="p-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded-2xl"
        >
          <GripVertical size={16} />
        </div>
        <button
          onClick={() => handleEdit(event)}
          className="p-2 bg-blue-200 text-blue-600 rounded-2xl hover:bg-blue-300"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={() => setDeleteConfirm(event.id)}
          className="p-2 bg-red-200 text-red-600 rounded-2xl hover:bg-red-300"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

const AcademicEventsDashboard = () => {
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
    videos: [""],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [yearFilter, setYearFilter] = useState("all");
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
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
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
        fetchEvents();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("id", editId);
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("date", formData.date);
    data.append("time", formData.time);
    data.append("location", formData.location);
    data.append(
      "videos",
      JSON.stringify(formData.videos.filter((v) => v.trim())),
    );
    if (formData.coverImage) data.append("coverImage", formData.coverImage);
    formData.additionalImages.forEach((file) =>
      data.append("additionalImages", file),
    );

    try {
      await axios.post(API_URL, data);
      await fetchEvents();
      setShowForm(false);
      resetForm();
    } catch (err) {
      alert("Save failed.");
    }
  };

  const toggleEventHighlight = async (id) => {
    try {
      await axios.patch(`${API_URL}/highlight/${id}`);
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API_URL}/${deleteConfirm}`);
      fetchEvents();
      setDeleteConfirm(null);
    } catch (err) {
      alert("Delete failed.");
    }
  };

  // Helper UI Handlers
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
  const handleEdit = (event) => {
    setFormData({
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      description: event.description,
      coverImage: null,
      coverImagePreview: event.coverImage,
      additionalImages: [],
      additionalImagesPreviews: event.additionalImages || [],
      videos: event.videos && event.videos.length > 0 ? event.videos : [""],
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
      videos: [""],
    });
  };
  const formatDate = (d) =>
    new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const availableYears = [
    ...new Set(events.map((e) => new Date(e.date).getFullYear().toString())),
  ].sort((a, b) => b - a);
  const filteredEvents = events.filter(
    (e) =>
      yearFilter === "all" ||
      new Date(e.date).getFullYear().toString() === yearFilter,
  );

  if (loading)
    return (
      <div className="p-10 text-center font-bold">
        Loading Academic Events...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 py-3 md:p-6 lg:p-8 relative overflow-hidden">
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl text-center">
            <h3 className="text-xl font-bold">Delete Event?</h3>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-gray-100 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center px-8">
          <h1 className="text-xl md:text-3xl font-bold text-gray-800">
            Academic Events
          </h1>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-6 py-2 bg-blue-400/30 text-blue-950 font-medium rounded-3xl flex items-center hover:bg-blue-400/50 transition-all"
          >
            <Plus size={20} className="mr-2" /> Add New
          </button>
        </div>

        <div className="flex flex-wrap gap-2 px-8 pt-4 mb-6">
          <button
            onClick={() => setYearFilter("all")}
            className={`px-8 py-2 rounded-full text-sm font-semibold ${yearFilter === "all" ? "bg-blue-400/30 text-blue-950 shadow-md" : "bg-gray-100 text-gray-600"}`}
          >
            All
          </button>
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => setYearFilter(year)}
              className={`px-8 py-2 rounded-full text-sm font-semibold ${yearFilter === year ? "bg-blue-400/30 text-blue-950 shadow-md" : "bg-gray-100 text-gray-600"}`}
            >
              {year}
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
            items={filteredEvents.map((e) => e.id.toString())}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-8 py-4">
              {filteredEvents.map((event) => (
                <SortableEventCard
                  key={event.id}
                  event={event}
                  toggleEventHighlight={toggleEventHighlight}
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
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-64 opacity-90 scale-105 border-2 border-blue-400">
                <img
                  src={
                    events.find((e) => e.id.toString() === activeId)?.coverImage
                  }
                  className="h-40 w-full object-cover"
                  alt="dragging"
                />
                <div className="p-4 font-bold text-sm">
                  {events.find((e) => e.id.toString() === activeId)?.title}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Form Sidebar Drawer */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowForm(false)}
          />
          <div
            className={`fixed inset-y-0 right-0 flex w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 translate-x-0`}
          >
            <div className="flex flex-col h-full w-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-bold text-lg">
                  {isEditing ? "Edit" : "Add"} Event
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              <form
                onSubmit={handleSubmit}
                className="flex-1 overflow-y-auto p-6 space-y-6"
              >
                <input
                  name="title"
                  required
                  className="w-full p-3 border rounded-xl"
                  placeholder="Title"
                  value={formData.title}
                  onChange={handleInputChange}
                />
                <textarea
                  name="description"
                  required
                  className="w-full p-3 border rounded-xl"
                  placeholder="Description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    name="date"
                    required
                    className="w-1/2 p-3 border rounded-xl"
                    value={formData.date}
                    onChange={handleInputChange}
                  />
                  <input
                    type="time"
                    name="time"
                    required
                    className="w-1/2 p-3 border rounded-xl"
                    value={formData.time}
                    onChange={handleInputChange}
                  />
                </div>
                <input
                  name="location"
                  required
                  className="w-full p-3 border rounded-xl"
                  placeholder="Location"
                  value={formData.location}
                  onChange={handleInputChange}
                />
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer"
                  onClick={() => document.getElementById("coverImg").click()}
                >
                  {formData.coverImagePreview ? (
                    <img
                      src={formData.coverImagePreview}
                      className="h-32 mx-auto rounded-lg object-cover"
                      alt="preview"
                    />
                  ) : (
                    <div className="text-gray-400 py-4 flex flex-col items-center">
                      <Plus size={24} />
                      <span className="text-sm mt-2">Upload Cover</span>
                    </div>
                  )}
                  <input
                    id="coverImg"
                    type="file"
                    hidden
                    onChange={handleCoverImageChange}
                    accept="image/*"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-400/30 text-blue-950 py-3 rounded-xl font-bold"
                >
                  {isEditing ? "Save Changes" : "Create Event"}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AcademicEventsDashboard;
