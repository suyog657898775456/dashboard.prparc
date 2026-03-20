"use client";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Upload,
  XCircle,
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

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${API_BASE_URL}/api/activity-flyers`;

// --- Sortable Item Component ---
const SortableFlyerCard = ({
  flyer,
  handleEdit,
  setFlyerToDelete,
  setShowDeleteModal,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: flyer.id.toString() });

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
      className="flex flex-col border w-64 h-80 border-gray-200 rounded-lg overflow-hidden shadow-lg hover:-translate-y-1 transition-all bg-white"
    >
      <div className="relative w-full h-52 bg-gray-100">
        <img
          src={flyer.imageUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-5 bg-white flex-1 flex flex-col">
        <p className="text-sm font-bold text-gray-800 mb-3 line-clamp-2 flex-1">
          {flyer.title}
        </p>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center text-gray-700">
            <Calendar className="w-4 h-4 mr-2 text-orange-500" />
            <span className="text-xs font-semibold">{flyer.date}</span>
          </div>
          <div className="flex gap-1 items-center">
            {/* DRAG HANDLE GROUPED WITH ACTIONS */}
            <div
              {...attributes}
              {...listeners}
              className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded-2xl"
            >
              <GripVertical size={14} />
            </div>
            <button
              onClick={() => handleEdit(flyer)}
              className="p-1.5 text-blue-600 bg-blue-200 rounded-2xl"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setFlyerToDelete(flyer);
                setShowDeleteModal(true);
              }}
              className="p-1.5 text-red-600 bg-red-200 rounded-2xl"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityFlyer = () => {
  const [allFlyers, setAllFlyers] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeYear, setActiveYear] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [flyerToDelete, setFlyerToDelete] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flyerData, setFlyerData] = useState({
    title: "",
    date: "",
    imagePreview: "",
    imageFile: null,
  });
  const fileInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchFlyers = async () => {
    try {
      const res = await axios.get(API_URL);
      setAllFlyers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlyers();
  }, []);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      const oldIndex = allFlyers.findIndex(
        (f) => f.id.toString() === active.id,
      );
      const newIndex = allFlyers.findIndex((f) => f.id.toString() === over.id);
      const newItems = arrayMove(allFlyers, oldIndex, newIndex);
      setAllFlyers(newItems);

      const sequenceData = newItems.map((item, index) => ({
        id: item.id,
        sequence_order: index,
      }));
      try {
        await axios.post(`${API_URL}/reorder`, { sequence: sequenceData });
      } catch (error) {
        fetchFlyers();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("id", editingId);
    data.append("title", flyerData.title.trim());
    data.append("date", flyerData.date);
    if (flyerData.imageFile) data.append("image", flyerData.imageFile);

    try {
      await axios.post(API_URL, data);
      fetchFlyers();
      setShowForm(false);
      resetForm();
    } catch (err) {
      alert("Save failed");
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/${flyerToDelete.id}`);
      fetchFlyers();
      setShowDeleteModal(false);
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleEdit = (flyer) => {
    setFlyerData({
      title: flyer.title,
      date: flyer.rawDate,
      imagePreview: flyer.imageUrl,
      imageFile: null,
    });
    setEditingId(flyer.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFlyerData({ title: "", date: "", imagePreview: "", imageFile: null });
    setEditingId(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file)
      setFlyerData((prev) => ({
        ...prev,
        imageFile: file,
        imagePreview: URL.createObjectURL(file),
      }));
  };

  const years = ["All", ...new Set(allFlyers.map((f) => f.year))].sort(
    (a, b) => b - a,
  );
  const currentFlyers =
    activeYear === "All"
      ? allFlyers
      : allFlyers.filter((f) => f.year === activeYear);

  if (loading)
    return <div className="p-10 text-center font-bold">Loading Flyers...</div>;

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 md:py-8">
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-xl sm:text-3xl font-extrabold text-gray-800 tracking-wider">
            Activity Flyer
          </h1>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center space-x-2 bg-blue-400/30 text-blue-950 font-medium px-6 py-3 rounded-3xl hover:shadow-lg transition-all duration-300"
          >
            <Plus className="w-5 h-5" /> <span>Add New</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-8">
          {years.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveYear(tab)}
              className={`px-8 py-2 rounded-3xl font-semibold transition-all ${activeYear === tab ? "bg-blue-400/30 text-blue-950 shadow-lg" : "bg-gray-100 text-gray-700"}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={currentFlyers.map((f) => f.id.toString())}
          strategy={rectSortingStrategy}
        >
          <section className="grid justify-items-center grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {currentFlyers.map((flyer) => (
              <SortableFlyerCard
                key={flyer.id}
                flyer={flyer}
                handleEdit={handleEdit}
                setFlyerToDelete={setFlyerToDelete}
                setShowDeleteModal={setShowDeleteModal}
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
              <div className="relative w-full h-52 bg-gray-100">
                <img
                  src={
                    allFlyers.find((f) => f.id.toString() === activeId)
                      ?.imageUrl
                  }
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
              <div className="p-5 flex-1 font-bold text-sm text-gray-800">
                {allFlyers.find((f) => f.id.toString() === activeId)?.title}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Side-over Form Panel and Delete Modal remain same as original logic */}
      {showForm && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowForm(false)}
          />
          <div className="absolute inset-y-0 right-0 w-screen sm:max-w-lg bg-white shadow-xl translate-x-0 transition-transform">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">
                {editingId ? "Edit" : "Add New"} Flyer
              </h2>
              <button onClick={() => setShowForm(false)}>
                <XCircle className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-6 overflow-y-auto h-full pb-24"
            >
              <input
                name="title"
                value={flyerData.title}
                onChange={(e) =>
                  setFlyerData({ ...flyerData, title: e.target.value })
                }
                className="w-full p-3 border rounded-lg"
                placeholder="Title"
                required
              />
              <input
                type="date"
                name="date"
                value={flyerData.date}
                onChange={(e) =>
                  setFlyerData({ ...flyerData, date: e.target.value })
                }
                className="w-full p-3 border rounded-lg"
                required
              />
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer"
                onClick={() => document.getElementById("fly-img").click()}
              >
                {flyerData.imagePreview ? (
                  <img
                    src={flyerData.imagePreview}
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
                  id="fly-img"
                  hidden
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
              <div className="flex gap-4 pt-4">
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
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative bg-white rounded-lg p-6 text-center max-w-sm w-full shadow-2xl">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-bold mb-6">Delete Flyer?</h3>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 border rounded-lg"
              >
                No
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityFlyer;