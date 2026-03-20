"use client";
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { X, Image as ImageIcon, Trash2, GripVertical } from "lucide-react";

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

const API_URL = "http://localhost:5000/api/slider";

// --- Sortable Item Component ---
const SortableImageItem = ({ image, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id.toString() });

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
      className="border rounded-lg overflow-hidden relative h-40 bg-gray-50"
    >
      <img
        src={image.url}
        alt={image.name}
        className="w-full h-full object-cover"
      />
      {/* Action Buttons */}
      <div className="absolute top-2 right-2 flex gap-2">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="p-2 bg-white/90 text-gray-500 rounded-full shadow-md cursor-grab active:cursor-grabbing hover:bg-white"
        >
          <GripVertical size={16} />
        </div>
        {/* Delete Button */}
        <button
          onClick={() => onDelete(image)}
          className="p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

const SimpleImageManager = ({ onClose }) => {
  const [images, setImages] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageToDelete, setImageToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fileInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchImages = async () => {
    try {
      const res = await axios.get(API_URL);
      setImages(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Load failed", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex(
        (img) => img.id.toString() === active.id,
      );
      const newIndex = images.findIndex((img) => img.id.toString() === over.id);

      const newItems = arrayMove(images, oldIndex, newIndex);
      setImages(newItems);

      const sequenceData = newItems.map((item, index) => ({
        id: item.id,
        sequence_order: index,
      }));

      try {
        await axios.post(`${API_URL}/reorder`, { sequence: sequenceData });
      } catch (error) {
        fetchImages(); // Revert on failure
      }
    }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    if (images.length >= 5) {
      setError("Maximum limit of 5 images reached.");
      return;
    }
    const formData = new FormData();
    formData.append("image", file);
    formData.append("name", file.name);
    try {
      await axios.post(`${API_URL}/add`, formData);
      fetchImages();
    } catch (err) {
      setError("Upload failed");
    }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API_URL}/${imageToDelete.id}`);
      fetchImages();
      setShowDeleteModal(false);
    } catch (err) {
      setError("Delete failed");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Slider...</div>;

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto">
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex justify-between"
          >
            <span>{error}</span>
            <button onClick={() => setError("")}>
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files[0])}
          className="hidden"
          ref={fileInputRef}
        />

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Delete Image?</h3>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white">
          {images.length === 0 ? (
            <div className="p-12 text-center">
              <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p>No images yet</p>
            </div>
          ) : (
            <div className="p-6">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={images.map((img) => img.id.toString())}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {images.map((image) => (
                      <SortableImageItem
                        key={image.id}
                        image={image}
                        onDelete={(img) => {
                          setImageToDelete(img);
                          setShowDeleteModal(true);
                        }}
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
                    <div className="border rounded-lg overflow-hidden h-40 w-full bg-white shadow-2xl opacity-90 scale-105 pointer-events-none">
                      <img
                        src={
                          images.find((img) => img.id.toString() === activeId)
                            ?.url
                        }
                        className="w-full h-full object-cover"
                        alt="dragging"
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          )}

          <div className="border-t p-6">
            <div className="max-w-md mx-auto border-2 border-dashed rounded-lg p-8 text-center bg-gray-50">
              {images.length < 5 ? (
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="px-6 py-3 bg-blue-400/30 text-blue-950 rounded-lg"
                >
                  Select Image ({images.length}/5)
                </button>
              ) : (
                <p className="text-red-500 font-medium">Limit Reached</p>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-4 p-6">
            <button onClick={onClose} className="px-10 py-3 border rounded-lg">
              Cancel
            </button>
            <button
              onClick={() => {
                alert("Slider configuration updated!");
                if (onClose) onClose();
              }}
              className="px-10 py-3 bg-blue-400/30 text-blue-950 rounded-lg font-medium"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleImageManager;
