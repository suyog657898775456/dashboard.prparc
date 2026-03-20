"use client";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Users,
  UserPlus,
  Star,
  Edit2,
  Trash2,
  X,
  ImageIcon,
  Search,
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
const API_URL = `${API_BASE_URL}/api/guests`;
// --- Sortable Item Component ---
const SortableGuestCard = ({
  guest,
  toggleFeatured,
  startEditing,
  setGuestToDelete,
  setShowDeleteConfirm,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: guest.id.toString() });

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
      className="relative bg-white w-56 rounded-xl shadow-xl overflow-hidden text-center border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
    >
      <div className="relative">
        <div className="h-52 bg-gray-100 overflow-hidden">
          {guest.image ? (
            <img
              src={guest.image}
              alt={guest.name}
              className="w-full h-64 object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <Users className="text-gray-400" size={48} />
            </div>
          )}
        </div>
        <button
          onClick={(e) => toggleFeatured(guest, e)}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-300 ${guest.featured ? "bg-yellow-400 shadow-md" : "bg-white/80"}`}
        >
          <Star
            size={20}
            className={
              guest.featured ? "text-white fill-white" : "text-gray-400"
            }
          />
        </button>
        <div className="absolute bottom-3 right-3 flex gap-2">
          {/* DRAG HANDLE GROUPED WITH ACTIONS */}
          <div
            {...attributes}
            {...listeners}
            className="p-2 bg-white text-gray-400 hover:text-gray-600 rounded-full shadow-lg cursor-grab active:cursor-grabbing transition-colors"
            title="Drag to reorder"
          >
            <GripVertical size={16} />
          </div>
          <button
            onClick={() => startEditing(guest)}
            className="p-2 bg-blue-200 text-blue-600 rounded-full shadow-lg hover:bg-blue-300 transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => {
              setGuestToDelete(guest);
              setShowDeleteConfirm(true);
            }}
            className="p-2 bg-red-200 text-red-600 rounded-full shadow-lg hover:bg-red-300 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="p-6">
        <h3 className="font-bold text-sm text-gray-800 mb-2">{guest.name}</h3>
        <p className="text-gray-600 text-xs ">{guest.designation}</p>
      </div>
    </div>
  );
};

const EminentGuests = () => {
  const [guests, setGuests] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [filteredGuests, setFilteredGuests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const [newGuest, setNewGuest] = useState({
    name: "",
    designation: "",
    image: "",
    file: null,
  });
  const [editedGuest, setEditedGuest] = useState({
    id: null,
    name: "",
    designation: "",
    image: "",
    featured: false,
    file: null,
  });

  const [guestToDelete, setGuestToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchGuests = async () => {
    try {
      const res = await axios.get(API_URL);
      setGuests(res.data);
      setFilteredGuests(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  useEffect(() => {
    const result = guests.filter(
      (guest) =>
        guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.designation.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredGuests(result);
  }, [searchTerm, guests]);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = guests.findIndex((g) => g.id.toString() === active.id);
      const newIndex = guests.findIndex((g) => g.id.toString() === over.id);

      const newItems = arrayMove(guests, oldIndex, newIndex);
      setGuests(newItems);

      // Prepare data for backend if you have a reorder endpoint
      const sequenceData = newItems.map((item, index) => ({
        id: item.id,
        sequence_order: index,
      }));

      try {
        await axios.post(`${API_URL}/reorder`, { sequence: sequenceData });
      } catch (error) {
        console.error("Failed to update sequence:", error);
        fetchGuests(); // Revert on failure
      }
    }
  };

  const handleAddGuest = async () => {
    if (!newGuest.name || !newGuest.designation) {
      alert("Please fill in required fields");
      return;
    }
    const formData = new FormData();
    formData.append("name", newGuest.name);
    formData.append("designation", newGuest.designation);
    if (newGuest.file) formData.append("image", newGuest.file);

    try {
      await axios.post(API_URL, formData);
      fetchGuests();
      setNewGuest({ name: "", designation: "", image: "", file: null });
      setShowAddForm(false);
    } catch (err) {
      alert("Add failed");
    }
  };

  const saveEditedGuest = async () => {
    if (!editedGuest.name || !editedGuest.designation) {
      alert("Please fill in all required fields");
      return;
    }
    const formData = new FormData();
    formData.append("name", editedGuest.name);
    formData.append("designation", editedGuest.designation);
    formData.append("featured", editedGuest.featured);
    if (editedGuest.file) formData.append("image", editedGuest.file);

    try {
      await axios.put(`${API_URL}/${editedGuest.id}`, formData);
      fetchGuests();
      setShowEditForm(false);
    } catch (err) {
      alert("Update failed");
    }
  };

  const toggleFeatured = async (guest, e) => {
    if (e) e.stopPropagation();
    try {
      await axios.put(`${API_URL}/${guest.id}`, {
        ...guest,
        featured: !guest.featured,
      });
      fetchGuests();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteGuest = async () => {
    try {
      await axios.delete(`${API_URL}/${guestToDelete.id}`);
      fetchGuests();
      setGuestToDelete(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleImageUpload = (event, type) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(file);
      if (type === "add")
        setNewGuest({ ...newGuest, image: previewUrl, file: file });
      else setEditedGuest({ ...editedGuest, image: previewUrl, file: file });
    }
  };

  const startEditing = (guest) => {
    setEditedGuest({ ...guest, file: null });
    setShowEditForm(true);
  };

  if (loading) return <div className="p-10 text-center">Loading Guests...</div>;

  return (
    <div className="min-h-screen p-4 md:p-0 overflow-x-hidden">
      <header className="mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 border rounded-3xl outline-none focus:ring-2 focus:ring-blue-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-6 py-3 w-40 bg-blue-400/30 text-blue-950 rounded-3xl transition flex items-center gap-1 shadow-lg font-semibold hover:bg-blue-400/50"
        >
          <UserPlus size={20} /> Add Guest
        </button>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredGuests.map((g) => g.id.toString())}
          strategy={rectSortingStrategy}
        >
          <div className="grid justify-items-center grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 py-8">
            {filteredGuests.map((guest) => (
              <SortableGuestCard
                key={guest.id}
                guest={guest}
                toggleFeatured={toggleFeatured}
                startEditing={startEditing}
                setGuestToDelete={setGuestToDelete}
                setShowDeleteConfirm={setShowDeleteConfirm}
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
            <div className="relative bg-white w-56 rounded-xl shadow-2xl overflow-hidden text-center border-2 border-blue-400 opacity-90 scale-105 pointer-events-none">
              <div className="h-52 bg-gray-100 overflow-hidden">
                <img
                  src={guests.find((g) => g.id.toString() === activeId)?.image}
                  className="w-full h-64 object-cover"
                  alt="dragging"
                />
              </div>
              <div className="p-6">
                <h3 className="font-bold text-sm text-gray-800">
                  {guests.find((g) => g.id.toString() === activeId)?.name}
                </h3>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add Form Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 ${showAddForm ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="text-xl font-bold">Add New Guest</h3>
            <button onClick={() => setShowAddForm(false)}>
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pt-6 space-y-4">
            <div
              className="aspect-square w-64 mx-auto border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer overflow-hidden hover:border-blue-400 transition-colors"
              onClick={() => fileInputRef.current.click()}
            >
              {newGuest.image ? (
                <img
                  src={newGuest.image}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon size={48} className="text-gray-300" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => handleImageUpload(e, "add")}
              />
            </div>
            <input
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="Guest Name"
              value={newGuest.name}
              onChange={(e) =>
                setNewGuest({ ...newGuest, name: e.target.value })
              }
            />
            <input
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="Designation"
              value={newGuest.designation}
              onChange={(e) =>
                setNewGuest({ ...newGuest, designation: e.target.value })
              }
            />
          </div>
          <button
            onClick={handleAddGuest}
            className="w-full py-3 bg-blue-400/30 text-blue-950 rounded-lg font-bold hover:bg-blue-400/50 transition-colors mt-4"
          >
            Add Guest
          </button>
        </div>
      </div>

      {/* Edit Form Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 ${showEditForm ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="text-xl font-bold">Edit Guest</h3>
            <button onClick={() => setShowEditForm(false)}>
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pt-6 space-y-4">
            <div
              className="aspect-square w-64 mx-auto border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer overflow-hidden"
              onClick={() => editFileInputRef.current.click()}
            >
              {editedGuest.image ? (
                <img
                  src={editedGuest.image}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon size={48} className="text-gray-300" />
              )}
              <input
                ref={editFileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => handleImageUpload(e, "edit")}
              />
            </div>
            <input
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="Guest Name"
              value={editedGuest.name}
              onChange={(e) =>
                setEditedGuest({ ...editedGuest, name: e.target.value })
              }
            />
            <input
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="Designation"
              value={editedGuest.designation}
              onChange={(e) =>
                setEditedGuest({ ...editedGuest, designation: e.target.value })
              }
            />
          </div>
          <button
            onClick={saveEditedGuest}
            className="w-full py-3 bg-blue-400/30 text-blue-950 rounded-lg font-bold hover:bg-blue-400/50 transition-colors mt-4"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <Trash2 className="mx-auto text-red-600 mb-4" size={48} />
            <h3 className="text-lg font-bold">Delete Guest?</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to remove {guestToDelete?.name}?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteGuest}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {(showAddForm || showEditForm) && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={() => {
            setShowAddForm(false);
            setShowEditForm(false);
          }}
        />
      )}
    </div>
  );
};

export default EminentGuests;
