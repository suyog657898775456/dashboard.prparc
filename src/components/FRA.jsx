"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil,
  Trash2,
  FileText,
  Plus,
  X,
  AlertCircle,
  GripVertical,
} from "lucide-react";
import axios from "axios";
import ActionButtons from "./uic/ActionButtons";
import DeleteModal from "./uic/deletemodal";

// Drag and Drop Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const API_URL = "http://localhost:5000/api/fra";

// --- Sortable Item Component ---
const SortableItem = ({
  tab,
  index,
  startEditing,
  triggerDeleteTab,
  formatDate,
  tabDeleteWarning,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-white p-5 rounded-3xl border shadow-sm flex justify-between items-center group hover:shadow-md transition-shadow ${
        tabDeleteWarning.show && tabDeleteWarning.tabId === tab.id
          ? "border-red-300"
          : "border-slate-200"
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="bg-red-50 p-4 rounded-2xl">
              <FileText size={28} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-800 mb-1">
                {tab.title}
              </h3>
              {tab.pdfFile ? (
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <span>
                    Uploaded on {formatDate(tab.pdfFile.uploadedDate)}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No PDF uploaded</p>
              )}
            </div>
          </div>

          {/* Action Buttons Container - Drag Handle moved here */}
          <div className="flex items-center gap-2">
            {/* Drag Handle Button */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              title="Drag to reorder"
            >
              <GripVertical size={20} />
            </div>

            {/* Edit Button */}
            <button
              onClick={() => startEditing(tab)}
              className="p-2 text-blue-600 bg-blue-200 hover:bg-blue-100 rounded-full transition-colors"
              title="Edit Tab"
            >
              <Pencil size={18} />
            </button>

            {/* Delete Button */}
            <button
              onClick={() => triggerDeleteTab(tab.id)}
              className="p-2 text-red-600 bg-red-200 hover:bg-red-100 rounded-full transition-colors"
              title="Delete Tab"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main FRA Component ---
const FRA = () => {
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editingPdf, setEditingPdf] = useState(false);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [originalTitle, setOriginalTitle] = useState("");
  const [originalPdfTitle, setOriginalPdfTitle] = useState("");

  const [deleteConfig, setDeleteConfig] = useState({ type: null, tabId: null });
  const [tabDeleteWarning, setTabDeleteWarning] = useState({
    show: false,
    tabId: null,
  });
  const [formData, setFormData] = useState({ title: "", pdfFile: null });

  // Setup Sensors for Drag and Drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchTabs = async () => {
    try {
      const response = await axios.get(API_URL);
      setTabs(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching FRA data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabs();
  }, []);

  // --- DRAG AND DROP END HANDLER ---
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = tabs.findIndex((item) => item.id === active.id);
      const newIndex = tabs.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(tabs, oldIndex, newIndex);
      setTabs(newItems);

      // Prepare data for backend using your existing logic
      const sequenceData = newItems.map((item, index) => ({
        id: item.id,
        sequence_order: index,
      }));

      try {
        await axios.post(`${API_URL}/reorder`, { sequence: sequenceData });
      } catch (error) {
        console.error("Failed to update sequence:", error);
        fetchTabs(); // Revert on failure
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isPdfUpdateEnabled = () => {
    if (pdfFile) return true;
    if (formData.pdfFile && pdfTitle.trim() !== originalPdfTitle.trim())
      return true;
    if (!formData.pdfFile && pdfTitle.trim() && pdfFile) return true;
    return false;
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = "Tab title is required";
    }
    const isDuplicate = tabs.some(
      (tab) =>
        tab.id !== editingId &&
        tab.title.toLowerCase() === formData.title.trim().toLowerCase(),
    );
    if (isDuplicate) newErrors.title = "A tab with this title already exists";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const triggerDeleteTab = (id) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab && tab.pdfFile) {
      setTabDeleteWarning({ show: true, tabId: id });
      return;
    }
    setDeleteConfig({ type: "TAB", tabId: id });
    setShowConfirm(true);
  };

  const triggerDeletePdf = () => {
    setDeleteConfig({ type: "PDF", tabId: editingId });
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    const { type, tabId } = deleteConfig;
    try {
      if (type === "TAB") {
        await axios.delete(`${API_URL}/${tabId}`);
        setTabs(tabs.filter((t) => t.id !== tabId));
        setIsEditing(false);
      } else if (type === "PDF") {
        setFormData((prev) => ({ ...prev, pdfFile: null }));
        setEditingPdf(false);
        setPdfTitle("");
        setPdfFile(null);
      }
      setShowConfirm(false);
    } catch (error) {
      alert("Error deleting item");
    }
  };

  const startEditing = (tab) => {
    setEditingId(tab.id);
    setFormData(JSON.parse(JSON.stringify(tab)));
    setOriginalTitle(tab.title);
    if (tab.pdfFile) setOriginalPdfTitle(tab.pdfFile.name);
    setPdfTitle("");
    setPdfFile(null);
    setEditingPdf(false);
    setErrors({});
    setIsEditing(true);
  };

  const startAddingTab = () => {
    setEditingId(null);
    setFormData({ title: "", pdfFile: null });
    setPdfTitle("");
    setPdfFile(null);
    setEditingPdf(false);
    setErrors({});
    setIsEditing(true);
  };

  const handlePdfFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      if (!pdfTitle.trim()) setPdfTitle(file.name.replace(".pdf", ""));
    } else {
      alert("Please select a valid PDF");
    }
  };

  const handlePdfUpload = () => {
    const finalTitle =
      pdfTitle.trim() || (pdfFile ? pdfFile.name : formData.pdfFile.name);
    setFormData((prev) => ({
      ...prev,
      pdfFile: {
        name: finalTitle,
        pendingFile: pdfFile,
        uploadedDate: new Date(),
      },
    }));
    setEditingPdf(false);
  };

  const saveChanges = async () => {
    if (!validateForm()) return;

    const data = new FormData();
    data.append("title", formData.title);

    if (pdfFile) {
      data.append("pdfFile", pdfFile);
      data.append("pdfName", pdfTitle || pdfFile.name);
    } else if (formData.pdfFile) {
      data.append("pdfName", formData.pdfFile.name);
    }

    try {
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, data);
      } else {
        await axios.post(API_URL, data);
      }
      fetchTabs();
      setIsEditing(false);
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  if (loading)
    return <div className="p-10 text-center">Loading FRA Data...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            FRA
          </h1>
          <button
            onClick={startAddingTab}
            className="bg-blue-400/30 text-blue-950 font-medium px-5 py-2.5 rounded-3xl flex items-center gap-2 shadow-md hover:bg-blue-400/40 transition-colors"
          >
            <Plus size={20} /> Add Tab
          </button>
        </div>

        {/* --- DRAG AND DROP CONTEXT --- */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tabs.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-6">
              {tabs.map((tab, index) => (
                <SortableItem
                  key={tab.id}
                  tab={tab}
                  index={index}
                  startEditing={startEditing}
                  triggerDeleteTab={triggerDeleteTab}
                  formatDate={formatDate}
                  tabDeleteWarning={tabDeleteWarning}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <AnimatePresence>
          {isEditing && (
            <div className="fixed inset-0 z-50 flex justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEditing(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col"
              >
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-20">
                  <h2 className="text-xl font-semibold text-slate-800">
                    {editingId ? "Update FRA Tab" : "Add FRA Tab"}
                  </h2>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-2 hover:bg-slate-100 rounded-full"
                  >
                    <X />
                  </button>
                </div>

                <div className="p-8 flex-1 overflow-y-auto space-y-8">
                  <div>
                    <label className="text-[12px] font-semibold text-slate-800">
                      Tab Title
                    </label>
                    <input
                      className={`w-full text-lg border-2 rounded-xl p-2 outline-none ${errors.title ? "border-red-300" : "border-slate-200"}`}
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-6 pb-10">
                    <h4 className="font-medium text-slate-700 border-b pb-4">
                      PDF File
                    </h4>
                    {formData.pdfFile && !editingPdf && (
                      <div className="flex gap-4 bg-white p-4 rounded-xl border border-slate-200 items-center">
                        <FileText size={28} className="text-red-500" />
                        <div className="flex-1 truncate">
                          <h5 className="text-sm font-medium">
                            {formData.pdfFile.name}
                          </h5>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingPdf(true);
                              setPdfTitle(formData.pdfFile.name);
                            }}
                            className="p-2 text-blue-600 bg-blue-200 rounded-2xl"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={triggerDeletePdf}
                            className="p-2 text-red-600 bg-red-200 rounded-2xl"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}

                    {(editingPdf || !formData.pdfFile) && (
                      <div className="bg-slate-50 p-4 rounded-xl border">
                        <input
                          type="text"
                          value={pdfTitle}
                          onChange={(e) => setPdfTitle(e.target.value)}
                          className="w-full p-2 border rounded-lg text-sm mb-3"
                          placeholder="Enter PDF title"
                        />
                        <div className="flex items-center gap-3">
                          <label className="flex-1 flex flex-col items-center p-4 border-2 border-dashed rounded-lg bg-white cursor-pointer">
                            <span className="text-sm">
                              {pdfFile ? pdfFile.name : "Choose PDF File*"}
                            </span>
                            <input
                              type="file"
                              accept=".pdf"
                              hidden
                              onChange={handlePdfFileSelect}
                            />
                          </label>
                          <div className="flex gap-2">
                            <button
                              onClick={handlePdfUpload}
                              disabled={!isPdfUpdateEnabled()}
                              className={`px-4 py-2 rounded-lg font-medium ${isPdfUpdateEnabled() ? "bg-blue-400/30 text-blue-950" : "bg-slate-200 text-slate-500"}`}
                            >
                              {formData.pdfFile ? "Update" : "Upload"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t bg-white">
                  <ActionButtons
                    isAdding={!editingId}
                    onSave={saveChanges}
                    onCancel={() => setIsEditing(false)}
                    saveDisabled={!formData.title.trim()}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
      <DeleteModal
        show={showConfirm}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
};

export default FRA;
