"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Video as VideoIcon,
  Plus,
  X,
  Trash2,
  Edit2,
  Star,
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
const API_URL = `${API_BASE_URL}/api/videos`;

// --- Sortable Item Component ---
const SortableVideoCard = ({ video, onFeaturedToggle, onDelete, onEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id.toString() });

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
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group border border-gray-200"
    >
      <div className="relative aspect-video bg-gray-100 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
          <div className="bg-black/70 rounded-full p-5">
            <VideoIcon className="w-12 h-12 text-white" />
          </div>
        </div>

        <div className="absolute top-3 right-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFeaturedToggle(video.id);
            }}
            className={`rounded-full p-2.5 shadow-lg transition-all duration-200 transform hover:scale-110 ${video.featured ? "bg-yellow-500 hover:bg-yellow-600" : "bg-white/80 hover:bg-white"} ${!video.featured && "opacity-70 group-hover:opacity-100"}`}
          >
            <Star
              className={`w-5 h-5 ${video.featured ? "text-white fill-white" : "text-gray-600"}`}
            />
          </button>
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-lg h-14 line-clamp-2 mb-3">
          {video.title}
        </h3>
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${video.featured ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}
          >
            {video.featured ? "Highlighted" : "Not Highlighted"}
          </span>

          <div className="flex items-center space-x-2">
            {/* DRAG HANDLE GROUPED WITH ACTIONS */}
            <div
              {...attributes}
              {...listeners}
              className="p-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded-2xl transition-colors"
            >
              <GripVertical size={16} />
            </div>
            <button
              onClick={() => onEdit(video)}
              className="text-blue-600 bg-blue-200 hover:bg-blue-100 rounded-2xl p-2 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(video)}
              className="text-red-600 bg-red-200 hover:bg-red-100 rounded-2xl p-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const VideoGallery = () => {
  const [videos, setVideos] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newVideo, setNewVideo] = useState({
    title: "",
    url: "",
    description: "",
  });
  const [editingVideo, setEditingVideo] = useState(null);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [showVideoDeleteConfirm, setShowVideoDeleteConfirm] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchVideos = async () => {
    try {
      const res = await axios.get(API_URL);
      setVideos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      const oldIndex = videos.findIndex((v) => v.id.toString() === active.id);
      const newIndex = videos.findIndex((v) => v.id.toString() === over.id);
      const newItems = arrayMove(videos, oldIndex, newIndex);
      setVideos(newItems);

      const sequenceData = newItems.map((item, index) => ({
        id: item.id,
        sequence_order: index,
      }));
      try {
        await axios.post(`${API_URL}/reorder`, { sequence: sequenceData });
      } catch (error) {
        fetchVideos();
      }
    }
  };

  // Standard Logic Handlers (Same as original)
  const handleAddVideo = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API_URL, newVideo);
      fetchVideos();
      resetVideoForm();
      setShowVideoForm(false);
    } catch (err) {
      alert("Save failed");
    }
  };

  const handleEditVideo = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/${editingVideo.id}`, editingVideo);
      fetchVideos();
      setEditingVideo(null);
      setShowVideoForm(false);
    } catch (err) {
      alert("Update failed");
    }
  };

  const handleVideoFeaturedToggle = async (id) => {
    try {
      await axios.patch(`${API_URL}/${id}/featured`);
      fetchVideos();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVideo = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchVideos();
      setShowVideoDeleteConfirm(false);
      setVideoToDelete(null);
    } catch (err) {
      alert("Delete failed");
    }
  };

  const resetVideoForm = () =>
    setNewVideo({ title: "", url: "", description: "" });

  if (loading)
    return <div className="p-10 text-center font-bold">Loading...</div>;

  return (
    <div className="min-h-screen max-w-6xl mx-auto p-4">
      <div className="mb-8">
        <div className="flex justify-end mb-6">
          <button
            onClick={() => {
              setEditingVideo(null);
              resetVideoForm();
              setShowVideoForm(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-400/30 text-blue-950 rounded-3xl font-medium shadow-md"
          >
            <Plus className="w-5 h-5" /> Add Video
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={videos.map((v) => v.id.toString())}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
              {videos.map((video) => (
                <SortableVideoCard
                  key={video.id}
                  video={video}
                  onFeaturedToggle={handleVideoFeaturedToggle}
                  onDelete={() => {
                    setVideoToDelete(video);
                    setShowVideoDeleteConfirm(true);
                  }}
                  onEdit={(v) => {
                    setEditingVideo({ ...v });
                    setShowVideoForm(true);
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
              <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-[500px] border-2 border-blue-500 opacity-90 scale-105 pointer-events-none">
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <VideoIcon className="w-12 h-12 text-gray-400" />
                </div>
                <div className="p-5 font-bold text-lg">
                  {videos.find((v) => v.id.toString() === activeId)?.title}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Slide-over Form remains identical */}
      {showVideoForm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowVideoForm(false)}
          />
          <div
            className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 p-6 translate-x-0`}
          >
            <div className="flex justify-between items-center border-b pb-4 mb-6">
              <h2 className="text-xl font-bold">
                {editingVideo ? "Edit" : "Add"} Video
              </h2>
              <button onClick={() => setShowVideoForm(false)}>
                <X size={24} />
              </button>
            </div>
            <form
              onSubmit={editingVideo ? handleEditVideo : handleAddVideo}
              className="space-y-6"
            >
              <input
                value={editingVideo ? editingVideo.title : newVideo.title}
                onChange={(e) =>
                  editingVideo
                    ? setEditingVideo({
                        ...editingVideo,
                        title: e.target.value,
                      })
                    : setNewVideo({ ...newVideo, title: e.target.value })
                }
                className="w-full p-3 border rounded-lg"
                placeholder="Title"
                required
              />
              <input
                type="url"
                value={editingVideo ? editingVideo.url : newVideo.url}
                onChange={(e) =>
                  editingVideo
                    ? setEditingVideo({ ...editingVideo, url: e.target.value })
                    : setNewVideo({ ...newVideo, url: e.target.value })
                }
                className="w-full p-3 border rounded-lg"
                placeholder="URL"
                required
              />
              <textarea
                value={
                  editingVideo ? editingVideo.description : newVideo.description
                }
                onChange={(e) =>
                  editingVideo
                    ? setEditingVideo({
                        ...editingVideo,
                        description: e.target.value,
                      })
                    : setNewVideo({ ...newVideo, description: e.target.value })
                }
                className="w-full p-3 border rounded-lg"
                rows="4"
                placeholder="Description"
              />
              <button
                type="submit"
                className="w-full py-3 bg-blue-400/30 text-blue-950 rounded-lg font-bold"
              >
                Save
              </button>
            </form>
          </div>
        </>
      )}

      {/* Delete Confirmation remains identical */}
      {showVideoDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md text-center shadow-2xl">
            <Trash2 className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-6 italic">
              Delete "{videoToDelete?.title}"?
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowVideoDeleteConfirm(false)}
                className="flex-1 py-3 border rounded-lg"
              >
                No
              </button>
              <button
                onClick={() => handleDeleteVideo(videoToDelete.id)}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold"
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

export default VideoGallery;
