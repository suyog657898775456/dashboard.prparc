"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil,
  Trash2,
  FileText,
  Plus,
  X,
  FilePlus,
  GripVertical,
  ChevronUp,
  ChevronDown,
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
const API_URL = `${API_BASE_URL}/api/naac`;

// --- Sortable Item Component ---
const SortableTabItem = ({
  tab,
  startEditing,
  setDeleteConfig,
  setShowConfirm,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id.toString() });

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
      className={`bg-white p-6 rounded-3xl border border-slate-200 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow ${
        isDragging ? "opacity-0" : "opacity-100"
      }`}
    >
      <h3 className="text-lg font-medium text-slate-800 ml-2">{tab.title}</h3>

      <div className="flex gap-2 items-center">
        {/* DRAG HANDLE GROUPED WITH ACTIONS */}
        <div
          {...attributes}
          {...listeners}
          className="p-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded-full transition-colors"
          title="Drag to reorder"
        >
          <GripVertical size={18} />
        </div>

        <button
          onClick={() => startEditing(tab)}
          className="p-2 text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200"
        >
          <Pencil size={18} />
        </button>
        <button
          onClick={() => {
            setDeleteConfig({ type: "TAB", tabId: tab.id });
            setShowConfirm(true);
          }}
          className="p-2 text-red-600 bg-red-100 rounded-full hover:bg-red-200"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

const NAAC = () => {
  const [tabs, setTabs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState({ type: null, tabId: null });
  const [formData, setFormData] = useState({ title: "", sections: [] });
  const [activePdfUploads, setActivePdfUploads] = useState({});
  const [editingSectionId, setEditingSectionId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchTabs = async () => {
    try {
      const res = await axios.get(API_URL);
      setTabs(res.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabs();
  }, []);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((t) => t.id.toString() === active.id);
      const newIndex = tabs.findIndex((t) => t.id.toString() === over.id);

      const newItems = arrayMove(tabs, oldIndex, newIndex);
      setTabs(newItems);

      const sequenceData = newItems.map((item, index) => ({
        id: item.id,
        sequence_order: index,
      }));

      try {
        await axios.post(`${API_URL}/reorder`, { sequence: sequenceData });
      } catch (error) {
        fetchTabs();
      }
    }
  };

  const saveChanges = async () => {
    if (!formData.title.trim()) return alert("Title required");

    const data = new FormData();
    data.append("id", editingId);
    data.append("title", formData.title);
    data.append("sections", JSON.stringify(formData.sections));

    formData.sections.forEach((sec) => {
      sec.files.forEach((f) => {
        if (f.rawFile) data.append(`pdf_${sec.id}_${f.id}`, f.rawFile);
      });
    });

    try {
      await axios.post(API_URL, data);
      await fetchTabs();
      setIsEditing(false);
    } catch (err) {
      alert("Error saving data.");
    }
  };

  // UI Handlers (Add Section, start editing, etc - unchanged UI logic)
  const startAddingTab = () => {
    setEditingId(null);
    setFormData({ title: "", sections: [] });
    setIsEditing(true);
  };
  const startEditing = (tab) => {
    setEditingId(tab.id);
    setFormData(JSON.parse(JSON.stringify(tab)));
    setIsEditing(true);
  };
  const cancelEditing = () => {
    setIsEditing(false);
    setEditingId(null);
  };
  const addSection = () => {
    const newId = Date.now();
    setFormData((prev) => ({
      ...prev,
      sections: [...prev.sections, { id: newId, sectionTitle: "", files: [] }],
    }));
    setEditingSectionId(newId);
  };

  if (loading)
    return (
      <div className="p-20 text-center font-bold">Loading NAAC Portal...</div>
    );

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            NAAC
          </h1>
          <button
            onClick={startAddingTab}
            className="bg-blue-400/30 text-blue-950 font-medium px-5 py-2.5 rounded-3xl flex items-center gap-2 shadow-md"
          >
            <Plus size={20} /> Add Tab
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tabs.map((t) => t.id.toString())}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-6">
              {tabs.map((tab) => (
                <SortableTabItem
                  key={tab.id}
                  tab={tab}
                  startEditing={startEditing}
                  setDeleteConfig={setDeleteConfig}
                  setShowConfirm={setShowConfirm}
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
              <div className="bg-white p-6 rounded-3xl border border-blue-400 flex justify-between items-center shadow-2xl opacity-90 scale-105">
                <h3 className="text-lg font-medium text-slate-800">
                  {tabs.find((t) => t.id.toString() === activeId)?.title}
                </h3>
                <GripVertical size={18} className="text-gray-400" />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <AnimatePresence>
          {isEditing && (
            <div className="fixed inset-0 z-50 flex justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={cancelEditing}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col"
              >
                <div className="p-6 border-b flex justify-between items-center bg-white z-20">
                  <h2 className="text-xl font-semibold">
                    {editingId ? "Edit Tab" : "Add New Tab"}
                  </h2>
                  <button
                    onClick={cancelEditing}
                    className="p-2 hover:bg-slate-100 rounded-full"
                  >
                    <X />
                  </button>
                </div>
                <div className="p-8 flex-1 overflow-y-auto space-y-8">
                  <input
                    className="w-full text-xl border-b-2 border-slate-200 focus:border-blue-500 outline-none pb-2 transition-all"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Tab Title"
                  />
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h4 className="font-bold text-slate-700">Sections</h4>
                      <button
                        onClick={addSection}
                        className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus size={16} /> Add Section
                      </button>
                    </div>
                    {formData.sections.map((section) => (
                      <div
                        key={section.id}
                        className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4"
                      >
                        <div className="flex justify-between items-start">
                          <input
                            className="bg-transparent text-lg font-bold outline-none border-b border-transparent focus:border-blue-400 w-full mr-4"
                            value={section.sectionTitle}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                sections: prev.sections.map((s) =>
                                  s.id === section.id
                                    ? { ...s, sectionTitle: e.target.value }
                                    : s,
                                ),
                              }))
                            }
                            placeholder="Section Title..."
                          />
                          <button
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                sections: prev.sections.filter(
                                  (s) => s.id !== section.id,
                                ),
                              }))
                            }
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-6 border-t bg-white sticky bottom-0">
                  <ActionButtons
                    isAdding={!editingId}
                    onSave={saveChanges}
                    onCancel={cancelEditing}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <DeleteModal
        show={showConfirm}
        onConfirm={async () => {
          if (deleteConfig.type === "TAB") {
            await axios.delete(`${API_URL}/${deleteConfig.tabId}`);
            fetchTabs();
          }
          setShowConfirm(false);
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
};

export default NAAC;
