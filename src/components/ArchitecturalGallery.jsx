"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Calendar,
  Trash2,
  Plus,
  X,
  Edit2,
  Info,
  AlertTriangle,
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

// Backend Configuration
const API_BASE = "http://localhost:5000/api/architectural-gallery";
const BACKEND_URL = "http://localhost:5000";

// --- Sortable Item Component ---
const SortableProjectCard = ({ work, handleEdit, setDeleteConfirmation }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: work.id.toString() });

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
      className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all w-64 h-full flex flex-col group cursor-default"
    >
      <div className="relative overflow-hidden pt-[70%] w-full">
        <img
          src={work.imageUrl}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
          alt={work.title}
        />
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-sm font-bold text-gray-900 mb-3 line-clamp-2">
          {work.title}
        </h3>
        <div className="mt-auto space-y-3">
          <div className="flex items-center text-gray-700">
            <Calendar className="w-4 h-4 mr-3 text-orange-500" />
            <span className="text-xs font-medium">
              {new Date(work.date).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              {work.additionalImages.length} images
            </span>
            <div className="flex gap-2 items-center">
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
                  handleEdit(work);
                }}
                className="bg-blue-200 text-blue-600 p-2 rounded-full hover:bg-blue-300"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmation({
                    isOpen: true,
                    projectId: work.id,
                    year: work.year,
                  });
                }}
                className="bg-red-200 text-red-600 p-2 rounded-full hover:bg-red-300"
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

const ArchitecturalGallery = () => {
  const [galleryByYear, setGalleryByYear] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState("All");
  const [isMobile, setIsMobile] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [images, setImages] = useState({
    main: null,
    mainFile: null,
    additional: [null, null, null, null],
    additionalFiles: [],
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    projectId: null,
    year: null,
  });

  const mainFileInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_BASE);
      const data = response.data;
      const grouped = data.reduce((acc, project) => {
        const year = new Date(project.project_date).getFullYear().toString();
        if (!acc[year]) acc[year] = [];
        acc[year].push({
          id: project.id,
          title: project.title,
          imageUrl: project.main_image.startsWith("http")
            ? project.main_image
            : `${BACKEND_URL}${project.main_image}`,
          additionalImages: project.additional_images.map((img) =>
            img.startsWith("http") ? img : `${BACKEND_URL}${img}`,
          ),
          date: project.project_date,
          year: year,
          sequence_order: project.sequence_order,
        });
        return acc;
      }, {});
      setGalleryByYear(grouped);
    } catch (error) {
      console.error("Error fetching gallery:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const currentList =
        activeYear === "All"
          ? Object.values(galleryByYear).flat()
          : galleryByYear[activeYear];
      const oldIndex = currentList.findIndex(
        (item) => item.id.toString() === active.id,
      );
      const newIndex = currentList.findIndex(
        (item) => item.id.toString() === over.id,
      );

      const newItems = arrayMove(currentList, oldIndex, newIndex);

      const sequenceData = newItems.map((item, index) => ({
        id: item.id,
        sequence_order: index,
      }));

      try {
        await axios.post(`${API_BASE}/reorder`, { sequence: sequenceData });
        fetchProjects();
      } catch (error) {
        console.error("Failed to update sequence:", error);
      }
    }
  };

  const displayedProjects = useMemo(() => {
    const list =
      activeYear === "All"
        ? Object.values(galleryByYear).flat()
        : galleryByYear[activeYear] || [];
    // If All is selected, we should respect the sequence_order overall,
    // otherwise the drag result might look jumpy due to grouping.
    if (activeYear === "All") {
      return list.sort(
        (a, b) => (a.sequence_order || 0) - (b.sequence_order || 0),
      );
    }
    return list;
  }, [galleryByYear, activeYear]);

  // Handlers for images and form
  const handleImageChange = (e, type) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (type === "main") {
        const file = files[0];
        setImages((prev) => ({
          ...prev,
          mainFile: file,
          main: URL.createObjectURL(file),
        }));
      } else {
        const fileArray = Array.from(files);
        const currentPreviews = [...images.additional];
        const currentFiles = [...images.additionalFiles];
        fileArray.forEach((file) => {
          const emptyIndex = currentPreviews.findIndex((img) => img === null);
          if (emptyIndex !== -1) {
            currentPreviews[emptyIndex] = URL.createObjectURL(file);
            currentFiles.push({ index: emptyIndex, file });
          } else {
            currentPreviews.push(URL.createObjectURL(file));
            currentFiles.push({ index: currentPreviews.length - 1, file });
          }
        });
        setImages((prev) => ({
          ...prev,
          additional: currentPreviews,
          additionalFiles: currentFiles,
        }));
      }
    }
  };

  const removeImage = (type, index = null) => {
    if (type === "main") {
      setImages((prev) => ({ ...prev, main: null, mainFile: null }));
    } else {
      const newAdditional = [...images.additional];
      newAdditional[index] = null;
      setImages((prev) => ({
        ...prev,
        additional: newAdditional,
        additionalFiles: prev.additionalFiles.filter((f) => f.index !== index),
      }));
    }
  };

  const resetForm = () => {
    setIsAddingProject(false);
    setEditingId(null);
    setImages({
      main: null,
      mainFile: null,
      additional: [null, null, null, null],
      additionalFiles: [],
    });
    setFormData({ title: "", date: new Date().toISOString().split("T")[0] });
  };

  const handleEdit = (project) => {
    setEditingId(project.id);
    setFormData({ title: project.title, date: project.date.split("T")[0] });
    const additionalSlots = [...project.additionalImages];
    while (additionalSlots.length < 4) additionalSlots.push(null);
    setImages({
      main: project.imageUrl,
      mainFile: null,
      additional: additionalSlots,
      additionalFiles: [],
    });
    setIsAddingProject(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!images.main) return alert("Main image is required");
    const data = new FormData();
    data.append("id", editingId);
    data.append("title", formData.title);
    data.append("project_date", formData.date);
    if (images.mainFile) data.append("mainImage", images.mainFile);
    else data.append("main_image", images.main.replace(BACKEND_URL, ""));
    const existingAdditional = images.additional
      .filter(
        (img) => img && typeof img === "string" && img.startsWith(BACKEND_URL),
      )
      .map((img) => img.replace(BACKEND_URL, ""));
    data.append("existing_additional", JSON.stringify(existingAdditional));
    images.additionalFiles.forEach((f) =>
      data.append("additionalImages", f.file),
    );
    try {
      await axios.post(API_BASE, data);
      fetchProjects();
      resetForm();
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  const executeDelete = async () => {
    try {
      await axios.delete(`${API_BASE}/${deleteConfirmation.projectId}`);
      fetchProjects();
      setDeleteConfirmation({ isOpen: false, projectId: null, year: null });
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (loading)
    return <div className="p-20 text-center font-bold">Loading Gallery...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans">
      {isMobile && (
        <div className="sticky top-0 z-40 px-2 py-3 flex items-center justify-between mb-6 bg-white shadow-sm rounded-xl">
          <h1 className="text-base font-bold text-gray-800">
            Architectural Gallery
          </h1>
          <button
            onClick={() => setIsAddingProject(true)}
            className="flex items-center gap-1.5 bg-blue-400/30 text-blue-950 px-3 py-2 rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-medium">Add Project</span>
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {!isMobile && (
          <header className="mb-6 flex justify-between items-center">
            <h1 className="text-xl md:text-3xl font-bold text-gray-800">
              Architectural Gallery
            </h1>
            <button
              onClick={() => setIsAddingProject(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-400/30 text-blue-950 font-semibold rounded-3xl transition-all shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>Add New</span>
            </button>
          </header>
        )}

        <div className="flex flex-wrap gap-2 md:gap-4 mb-8">
          {["All", ...Object.keys(galleryByYear).sort((a, b) => b - a)].map(
            (year) => (
              <button
                key={year}
                onClick={() => setActiveYear(year)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeYear === year ? "bg-blue-400/30 text-blue-950 shadow-lg" : "bg-gray-100 text-gray-700"}`}
              >
                {year}
              </button>
            ),
          )}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayedProjects.map((p) => p.id.toString())}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 justify-items-center sm:justify-items-start">
              {displayedProjects.map((work) => (
                <SortableProjectCard
                  key={work.id}
                  work={work}
                  handleEdit={handleEdit}
                  setDeleteConfirmation={setDeleteConfirmation}
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
                      displayedProjects.find(
                        (p) => p.id.toString() === activeId,
                      )?.imageUrl
                    }
                    className="absolute inset-0 w-full h-full object-cover"
                    alt=""
                  />
                </div>
                <div className="p-4 font-bold text-sm">
                  {
                    displayedProjects.find((p) => p.id.toString() === activeId)
                      ?.title
                  }
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {deleteConfirmation.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl text-center">
              <div className="flex flex-col items-center text-center">
                <div className="bg-red-50 p-4 rounded-full mb-4">
                  <AlertTriangle className="text-red-500 w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Are you sure?
                </h3>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() =>
                    setDeleteConfirmation({
                      isOpen: false,
                      projectId: null,
                      year: null,
                    })
                  }
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

        <div
          className={`fixed inset-0 z-50 transition-all ${isAddingProject ? "visible" : "invisible"}`}
        >
          <div
            className={`absolute inset-0 bg-black transition-opacity ${isAddingProject ? "opacity-50" : "opacity-0"}`}
            onClick={resetForm}
          />
          <div
            className={`absolute inset-y-0 right-0 max-w-lg w-full bg-white shadow-2xl transition-transform ${isAddingProject ? "translate-x-0" : "translate-x-full"}`}
          >
            <div className="flex flex-col h-full overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingId ? "Edit Project" : "Add New Project"}
                </h2>
                <button
                  onClick={resetForm}
                  className="rounded-full p-2 hover:bg-gray-100"
                >
                  <X />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <input
                  type="text"
                  placeholder="Title *"
                  required
                  className="w-full p-3 border rounded-xl"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
                <input
                  type="date"
                  required
                  className="w-full p-3 border rounded-xl"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
                <div>
                  <label className="text-sm font-bold block mb-2">
                    Main Image *
                  </label>
                  <div className="w-full h-48 border-2 border-dashed rounded-2xl flex items-center justify-center bg-gray-50 relative overflow-hidden">
                    {images.main ? (
                      <>
                        <img
                          src={images.main}
                          className="w-full h-full object-cover"
                          alt="preview"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage("main")}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => mainFileInputRef.current.click()}
                        className="flex flex-col items-center"
                      >
                        <Plus />
                        <span>Upload Main</span>
                      </button>
                    )}
                    <input
                      type="file"
                      hidden
                      ref={mainFileInputRef}
                      onChange={(e) => handleImageChange(e, "main")}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold block mb-2">
                    Gallery Images
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {images.additional.map((img, idx) => (
                      <div
                        key={idx}
                        className="aspect-square border-2 border-dashed rounded-lg bg-gray-50 relative overflow-hidden flex items-center justify-center"
                      >
                        {img ? (
                          <>
                            <img
                              src={img}
                              className="w-full h-full object-cover"
                              alt=""
                            />
                            <button
                              type="button"
                              onClick={() => removeImage("additional", idx)}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                            >
                              <X size={10} />
                            </button>
                          </>
                        ) : (
                          <Plus
                            className="cursor-pointer text-gray-300"
                            onClick={() => {
                              const i = document.createElement("input");
                              i.type = "file";
                              i.multiple = true;
                              i.onchange = (e) =>
                                handleImageChange(e, "additional");
                              i.click();
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="py-3 bg-gray-100 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-3 bg-blue-400/30 text-blue-950 rounded-xl font-bold shadow-md"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchitecturalGallery;
