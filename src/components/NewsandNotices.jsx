"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  Plus,
  X,
  Edit2,
  Trash2,
  Upload,
  AlertTriangle,
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

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_BASE = `${API_BASE_URL}/api/college-news`;
const BACKEND_URL = API_BASE_URL;
// --- Sortable Item Component ---
const SortableNewsCard = ({
  news,
  handleEdit,
  openDeleteModal,
  formatDate,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: news.id.toString() });

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
      className="flex flex-col border w-64 border-gray-200 rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl group bg-white"
    >
      <div className="relative aspect-video w-full h-48 sm:h-48 md:h-44 overflow-hidden">
        <img
          src={
            news.imageUrl ||
            "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=500&q=80"
          }
          alt={news.title}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-1">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span>{formatDate(news.date)}</span>
          </div>
          <h3 className="text-sm font-bold text-blue-950 line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors">
            {news.title}
          </h3>
          <p className="text-xs h-12 text-gray-600 line-clamp-3">
            {news.description}
          </p>
        </div>
        <div className="mt-auto">
          <div className="flex justify-end">
            <div className="flex gap-2 items-center">
              {/* DRAG HANDLE GROUPED WITH ACTIONS */}
              <div
                {...attributes}
                {...listeners}
                className="p-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded-2xl transition-colors"
              >
                <GripVertical size={16} />
              </div>
              <button
                onClick={() => handleEdit(news)}
                className="p-2 text-blue-600 bg-blue-200 hover:bg-blue-100 rounded-2xl transition-colors"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => openDeleteModal(news)}
                className="p-2 text-red-600 bg-red-200 hover:bg-red-100 rounded-2xl transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NewsUpdates = () => {
  const [activeYear, setActiveYear] = useState("All");
  const [activeId, setActiveId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    title: "",
    description: "",
    imageUrl: "",
    imageFile: null,
    date: new Date().toISOString().split("T")[0],
    category: "Workshop",
    link: "",
    fullContent: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newsToDelete, setNewsToDelete] = useState(null);
  const [newsByYear, setNewsByYear] = useState({});
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_BASE);
      const grouped = response.data.reduce((acc, item) => {
        const year = new Date(item.event_date).getFullYear().toString();
        if (!acc[year]) acc[year] = [];
        acc[year].push({
          ...item,
          id: item.id,
          imageUrl: item.image_url
            ? item.image_url.startsWith("http")
              ? item.image_url
              : `${BACKEND_URL}${item.image_url}`
            : "",
          date: item.event_date.split("T")[0],
          fullContent: item.full_content,
        });
        return acc;
      }, {});
      setNewsByYear(grouped);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const currentList =
        activeYear === "All" ? allNews : newsByYear[activeYear] || [];
      const oldIndex = currentList.findIndex(
        (n) => n.id.toString() === active.id,
      );
      const newIndex = currentList.findIndex(
        (n) => n.id.toString() === over.id,
      );

      const newItems = arrayMove(currentList, oldIndex, newIndex);

      // Reorder persistence logic
      const sequenceData = newItems.map((item, index) => ({
        id: item.id,
        sequence_order: index,
      }));

      try {
        await axios.post(`${API_BASE}/reorder`, { sequence: sequenceData });
        fetchNews(); // Sync with DB
      } catch (error) {
        console.error("Failed to update sequence:", error);
      }
    }
  };

  const totalArticlesCount = useMemo(
    () =>
      Object.values(newsByYear).reduce(
        (total, yearNews) => total + yearNews.length,
        0,
      ),
    [newsByYear],
  );

  const allNews = useMemo(() => {
    return Object.entries(newsByYear)
      .flatMap(([year, articles]) =>
        articles.map((article) => ({
          ...article,
          displayYear: year,
          uniqueId: `${year}-${article.id}`,
        })),
      )
      .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));
  }, [newsByYear]);

  const currentNews =
    activeYear === "All" ? allNews : newsByYear[activeYear] || [];
  const availableYears = useMemo(
    () => Object.keys(newsByYear).sort((a, b) => parseInt(b) - parseInt(a)),
    [newsByYear],
  );
  const tabOrder = ["All", ...availableYears];

  // Logic Handlers (Same as original)
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        imageFile: file,
        imageUrl: URL.createObjectURL(file),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("full_content", formData.fullContent || formData.description);
    data.append("event_date", formData.date);
    data.append("category", formData.category);
    data.append("link", formData.link);
    if (formData.imageFile) data.append("image", formData.imageFile);

    try {
      const url = isEditing ? `${API_BASE}/${formData.id}` : API_BASE;
      await axios[isEditing ? "put" : "post"](url, data);
      fetchNews();
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error(error);
    }
  };

  const confirmDelete = async () => {
    if (newsToDelete) {
      try {
        await axios.delete(`${API_BASE}/${newsToDelete.id}`);
        fetchNews();
        setShowDeleteModal(false);
        setNewsToDelete(null);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleEdit = (news) => {
    setFormData({
      id: news.id,
      title: news.title,
      description: news.description,
      imageUrl: news.imageUrl,
      imageFile: null,
      date: news.date,
      category: news.category,
      link: news.link,
      fullContent: news.fullContent,
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const resetForm = () =>
    setFormData({
      id: 0,
      title: "",
      description: "",
      imageUrl: "",
      imageFile: null,
      date: new Date().toISOString().split("T")[0],
      category: "Workshop",
      link: "",
      fullContent: "",
    });
  const removeImage = () =>
    setFormData((prev) => ({ ...prev, imageUrl: "", imageFile: null }));
  const formatDate = (ds) =>
    new Date(ds).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading)
    return (
      <div className="p-20 text-center font-bold">Loading News Portal...</div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">
            College News & Updates
          </h1>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-blue-400/30 text-blue-950 font-medium py-2.5 px-6 rounded-3xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" /> Add New
          </button>
        </header>

        <div className="flex flex-wrap gap-2 mb-8">
          {tabOrder.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveYear(tab)}
              className={`px-8 py-2 rounded-3xl text-sm font-semibold transition-all duration-200 ${activeYear === tab ? "bg-blue-400/30 text-blue-950 shadow-md" : "bg-white text-gray-700 border hover:bg-gray-50"}`}
            >
              {tab}
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
            items={currentNews.map((n) => n.id.toString())}
            strategy={rectSortingStrategy}
          >
            <div className="grid justify-items-center grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentNews.map((news) => (
                <SortableNewsCard
                  key={news.id}
                  news={news}
                  handleEdit={handleEdit}
                  openDeleteModal={setNewsToDelete}
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
              <div className="flex flex-col border w-64 border-blue-400 rounded-lg overflow-hidden shadow-2xl bg-white opacity-90 scale-105 pointer-events-none">
                <div className="relative aspect-video w-full h-44 overflow-hidden">
                  <img
                    src={
                      allNews.find((n) => n.id.toString() === activeId)
                        ?.imageUrl
                    }
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 font-bold text-sm">
                  {allNews.find((n) => n.id.toString() === activeId)?.title}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Forms & Modal remain same as original logic */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => {
              setShowForm(false);
              resetForm();
            }}
          />
          <div className="absolute inset-y-0 right-0 max-w-lg w-full bg-white shadow-2xl transition-transform duration-300 translate-x-0 p-6">
            <div className="flex justify-between items-center mb-6 pb-2 border-b">
              <h2 className="text-2xl font-bold">
                {isEditing ? "Edit News" : "Add New"}
              </h2>
              <button onClick={() => setShowForm(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="space-y-5 overflow-y-auto h-full pb-20"
            >
              <input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg"
                placeholder="Title"
                required
              />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg"
                rows={4}
                required
              />
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg"
              />
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer"
                onClick={() => document.getElementById("image-upload").click()}
              >
                {formData.imageUrl ? (
                  <img
                    src={formData.imageUrl}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="text-blue-600 mb-2" />
                    <p className="text-xs font-medium">Click to upload image</p>
                  </div>
                )}
                <input
                  type="file"
                  id="image-upload"
                  hidden
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-400/30 text-blue-950 py-3 rounded-lg"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Delete News Item</h3>
            <p className="mb-6 text-gray-600">
              Are you sure you want to delete "{newsToDelete?.title}"?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg"
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

export default NewsUpdates;
