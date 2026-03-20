"use client";
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Image as ImageIcon,
  Link as LinkIcon,
  GripVertical,
} from "lucide-react";
import { FaRegFilePdf } from "react-icons/fa";

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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${API_BASE_URL}/api/news`;
// --- Sortable Item Component ---
const SortableNoticeItem = ({
  item,
  handleEdit,
  setItemToDelete,
  setShowDeleteConfirm,
  getFileTypeIcon,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id.toString() });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: "relative",
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex items-center gap-2 ${
        isDragging ? "opacity-30" : "opacity-100"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-gray-800 truncate flex-1 mr-3">
            {item.title}
          </h3>

          {/* Action Buttons Container - Moved Drag Handle Here */}
          <div className="flex items-center gap-2">
            {/* Drag Handle Button */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Drag to reorder"
            >
              <GripVertical size={20} />
            </div>

            {/* Edit Button */}
            <button
              onClick={() => handleEdit(item)}
              className="p-2 text-blue-600 bg-blue-200 rounded-2xl hover:bg-blue-300 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Delete Button */}
            <button
              onClick={() => {
                setItemToDelete(item);
                setShowDeleteConfirm(true);
              }}
              className="p-2 text-red-600 bg-red-200 rounded-2xl hover:bg-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center text-sm text-gray-500 mb-2">
          <Calendar size={16} className="mr-2" />
          <span>Uploaded: {item.uploadDate}</span>
        </div>

        <div className="p-2 bg-gray-50 rounded-lg border flex items-center">
          {getFileTypeIcon(item.file_type)}
          <span className="ml-3 font-medium text-gray-700 truncate">
            {item.fileName}
          </span>
        </div>
      </div>
    </div>
  );
};

const NewsNoticesDashboard = () => {
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [currentItem, setCurrentItem] = useState({
    id: "",
    title: "",
    type: "news",
    fileType: "pdf",
    linkUrl: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchItems = async () => {
    try {
      const res = await axios.get(API_URL);
      setItems(res.data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id.toString() === active.id);
      const newIndex = items.findIndex((i) => i.id.toString() === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);

      // Update state immediately so it stays fixed
      setItems(newItems);

      const sequenceData = newItems.map((item, index) => ({
        id: item.id,
        sequence_order: index,
      }));

      try {
        await axios.post(`${API_URL}/reorder`, { sequence: sequenceData });
      } catch (error) {
        console.error("Failed to reorder:", error);
        fetchItems(); // Revert only if server call fails
      }
    }
    setActiveId(null);
  };

  const handleSubmit = async () => {
    if (!currentItem.title.trim()) return alert("Enter a title");
    setIsUploading(true);
    const formData = new FormData();
    formData.append("title", currentItem.title);
    formData.append("type", currentItem.type);
    formData.append("fileType", currentItem.fileType);
    if (currentItem.fileType === "link")
      formData.append("linkUrl", currentItem.linkUrl);
    else if (selectedFile) formData.append("file", selectedFile);

    try {
      if (currentItem.id)
        await axios.put(`${API_URL}/${currentItem.id}`, formData);
      else await axios.post(API_URL, formData);
      fetchItems();
      closeForm();
    } catch (error) {
      alert("Operation failed");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API_URL}/${itemToDelete.id}`);
      fetchItems();
      setShowDeleteConfirm(false);
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleEdit = (item) => {
    setCurrentItem({
      ...item,
      fileType: item.file_type,
      linkUrl: item.file_type === "link" ? item.fileUrl : "",
    });
    setSelectedFile(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };
  const resetForm = () => {
    setCurrentItem({
      id: "",
      title: "",
      type: "news",
      fileType: "pdf",
      linkUrl: "",
    });
    setSelectedFile(null);
  };

  const getFileTypeIcon = (fileType) => {
    if (fileType === "pdf")
      return <FaRegFilePdf className="text-orange-400 w-5 h-5" />;
    if (fileType === "image")
      return <ImageIcon className="text-green-500 w-5 h-5" />;
    return <LinkIcon className="text-blue-500 w-5 h-5" />;
  };

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500">Loading Notices...</div>
    );

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-blue-400/30 text-blue-950 rounded-3xl font-medium shadow-md hover:bg-blue-400/40 transition-colors"
          >
            Add New
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id.toString())}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-4">
              {items.map((item) => (
                <SortableNoticeItem
                  key={item.id}
                  item={item}
                  handleEdit={handleEdit}
                  setItemToDelete={setItemToDelete}
                  setShowDeleteConfirm={setShowDeleteConfirm}
                  getFileTypeIcon={getFileTypeIcon}
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
              <div className="bg-white rounded-xl shadow-2xl border border-blue-400 p-3 flex items-center gap-2 opacity-90 scale-105 pointer-events-none">
                <GripVertical size={20} className="text-gray-400" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800">
                    {items.find((i) => i.id.toString() === activeId)?.title}
                  </h3>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <div
          className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl transition-transform z-50 ${showForm ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="h-full flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold">
                {currentItem.id ? "Edit Item" : "Add Notice"}
              </h2>
              <button onClick={closeForm}>
                <X size={24} />
              </button>
            </div>
            <div className="space-y-6">
              <input
                type="text"
                className="w-full p-3 border rounded-lg"
                placeholder="Notice Title"
                value={currentItem.title}
                onChange={(e) =>
                  setCurrentItem({ ...currentItem, title: e.target.value })
                }
              />
              <div className="grid grid-cols-3 gap-2">
                {["pdf", "image", "link"].map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      setCurrentItem({ ...currentItem, fileType: t })
                    }
                    className={`p-3 border-2 rounded-lg flex flex-col items-center ${currentItem.fileType === t ? "border-blue-500 bg-blue-50" : "border-gray-100"}`}
                  >
                    {getFileTypeIcon(t)}
                    <span className="text-xs block mt-1 capitalize">{t}</span>
                  </button>
                ))}
              </div>
              {currentItem.fileType === "link" ? (
                <input
                  type="url"
                  className="w-full p-3 border rounded-lg"
                  placeholder="https://..."
                  value={currentItem.linkUrl}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, linkUrl: e.target.value })
                  }
                />
              ) : (
                <div
                  className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer"
                  onClick={() => fileInputRef.current.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                  />
                  <p className="text-sm text-gray-500">
                    {selectedFile ? selectedFile.name : "Click to select file"}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={handleSubmit}
              className="w-full py-4 bg-blue-400/30 text-blue-950 font-bold rounded-lg mt-8"
            >
              {isUploading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-xl p-6 w-full max-w-md text-center">
              <Trash2 className="mx-auto text-red-600 mb-4 w-12 h-12" />
              <p className="mb-6 font-medium text-gray-800">
                Delete "{itemToDelete?.title}"?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg"
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

export default NewsNoticesDashboard;
