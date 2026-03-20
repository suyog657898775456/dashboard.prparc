"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Trash2, Edit2, GripVertical, X as XIcon } from "lucide-react";
import { FaRegFilePdf } from "react-icons/fa";
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${API_BASE_URL}/api/calendars`;

// --- Sortable Item Component ---
const SortableCalendarItem = ({
  pdf,
  startEditing,
  showDeleteConfirmation,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pdf.id.toString() });

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
      className={`border-b-4 border-orange-400 rounded-lg p-4 shadow-lg bg-white flex items-start space-x-4 overflow-hidden ${
        isDragging ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex-shrink-0">
        <div className="w-14 h-16 rounded-lg flex items-center justify-center border border-orange-400">
          <FaRegFilePdf className="text-orange-400 w-8 h-8" />
        </div>
      </div>
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-800 truncate">{pdf.name}</h3>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Uploaded: {pdf.uploadDate}</span>
          <div className="flex space-x-2 items-center">
            {/* DRAG HANDLE MOVED HERE */}
            <div
              {...attributes}
              {...listeners}
              className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded-lg"
            >
              <GripVertical size={16} />
            </div>

            <button
              onClick={() => startEditing(pdf)}
              className="text-blue-600 bg-blue-200 rounded-2xl p-1"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => showDeleteConfirmation(pdf.id, pdf.name)}
              className="text-red-600 bg-red-200 rounded-2xl p-1"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AcademicCalendar = () => {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingDragging, setIsEditingDragging] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingFile, setEditingFile] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [newFile, setNewFile] = useState(null);
  const [newFileName, setNewFileName] = useState("");
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchCalendars = async () => {
    try {
      const res = await axios.get(API_URL);
      setPdfFiles(res.data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendars();
  }, []);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = pdfFiles.findIndex((i) => i.id.toString() === active.id);
      const newIndex = pdfFiles.findIndex((i) => i.id.toString() === over.id);

      const newItems = arrayMove(pdfFiles, oldIndex, newIndex);
      setPdfFiles(newItems);

      const sequenceData = newItems.map((item, index) => ({
        id: item.id,
        sequence_order: index,
      }));

      try {
        await axios.post(`${API_URL}/reorder`, { sequence: sequenceData });
      } catch (error) {
        fetchCalendars();
      }
    }
  };

  const handleUploadClick = async () => {
    if (selectedFile) {
      const formData = new FormData();
      formData.append(
        "name",
        fileName || selectedFile.name.replace(/\.pdf$/i, ""),
      );
      formData.append("pdf", selectedFile);
      try {
        await axios.post(API_URL, formData);
        fetchCalendars();
        handleCancelAdd();
      } catch (err) {
        alert("Upload failed");
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const saveEdit = async () => {
    if (!editValue.trim() || !editingFile) return;
    const formData = new FormData();
    formData.append("name", editValue.trim());
    if (newFile) formData.append("pdf", newFile);
    try {
      await axios.put(`${API_URL}/${editingFile.id}`, formData);
      fetchCalendars();
      cancelEdit();
    } catch (err) {
      alert("Update failed");
    }
  };

  const removeFile = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchCalendars();
      setDeleteConfirm(null);
    } catch (err) {
      alert("Delete failed");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0].type === "application/pdf")
      setSelectedFile(files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf",
    );
    if (files.length > 0) setSelectedFile(files[0]);
  };

  const handleEditFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setNewFile(files[0]);
      setNewFileName(files[0].name.replace(/\.pdf$/i, ""));
    }
  };

  const showDeleteConfirmation = (id, name) => setDeleteConfirm({ id, name });
  const cancelDelete = () => setDeleteConfirm(null);
  const startEditing = (file) => {
    setEditingFile(file);
    setEditValue(file.name);
    setNewFile(null);
    setNewFileName("");
    setShowEditPanel(true);
  };
  const cancelEdit = () => {
    setShowEditPanel(false);
    setEditingFile(null);
  };
  const removeNewFile = () => {
    setNewFile(null);
    setNewFileName("");
  };
  const removeSelectedFile = () => {
    setSelectedFile(null);
  };
  const handleCancelAdd = () => {
    setSelectedFile(null);
    setFileName("");
    setShowAddPanel(false);
  };

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500 font-bold uppercase tracking-widest">
        Loading Academic Calendars...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 relative overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">
            Academic Calendar
          </h1>
          <button
            id="add-button"
            onClick={() => setShowAddPanel(true)}
            className="bg-blue-400/30 text-blue-950 font-medium py-2 px-4 rounded-3xl flex items-center transition-all shadow-sm hover:shadow-md"
          >
            <Upload className="w-5 h-5 mr-2" /> Add File
          </button>
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={pdfFiles.map((p) => p.id.toString())}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pdfFiles.map((pdf) => (
                <SortableCalendarItem
                  key={pdf.id}
                  pdf={pdf}
                  startEditing={startEditing}
                  showDeleteConfirmation={showDeleteConfirmation}
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
              <div className="border-b-4 border-orange-400 rounded-lg p-4 shadow-2xl bg-white flex items-start space-x-4 opacity-90 scale-105">
                <FaRegFilePdf className="text-orange-400 w-8 h-8 flex-shrink-0" />
                <div className="flex-1 truncate">
                  <h3 className="font-medium text-gray-800">
                    {pdfFiles.find((p) => p.id.toString() === activeId)?.name}
                  </h3>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Form Drawer Panels (Add & Edit) remain essentially same but hooked to fetch */}
        {showAddPanel && (
          <div
            id="add-panel"
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">
                Upload Calendar
              </h2>
              <button onClick={handleCancelAdd}>
                <XIcon className="text-gray-400" />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="File Name"
                className="w-full p-3 border rounded-lg"
              />
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                <p className="text-sm font-medium">
                  {selectedFile
                    ? selectedFile.name
                    : "Drop PDF here or click to browse"}
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  hidden
                  accept=".pdf"
                  onChange={handleFileSelect}
                />
              </div>
            </div>
            <div className="pt-6 border-t flex space-x-3">
              <button
                onClick={handleCancelAdd}
                className="flex-1 py-3 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadClick}
                disabled={!selectedFile}
                className="flex-1 py-3 bg-blue-400/30 text-blue-950 font-bold rounded-lg disabled:opacity-50"
              >
                Upload
              </button>
            </div>
          </div>
        )}

        {showEditPanel && editingFile && (
          <div
            id="edit-panel"
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">Edit File</h2>
              <button onClick={() => setShowEditPanel(false)}>
                <XIcon className="text-gray-400" />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
              <div
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer border-gray-300"
                onClick={() => editFileInputRef.current?.click()}
              >
                <Upload className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                <p className="text-sm font-medium">
                  {newFile ? newFile.name : "Choose new PDF to replace current"}
                </p>
                <input
                  type="file"
                  ref={editFileInputRef}
                  hidden
                  accept=".pdf"
                  onChange={handleEditFileSelect}
                />
              </div>
            </div>
            <div className="pt-6 border-t flex space-x-3">
              <button
                onClick={() => setShowEditPanel(false)}
                className="flex-1 py-3 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 py-3 bg-blue-400/30 text-blue-950 font-bold rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl text-center">
              <Trash2 className="mx-auto text-red-600 mb-4 w-12 h-12" />
              <p className="mb-6 font-medium">Delete "{deleteConfirm.name}"?</p>
              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 py-3 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeFile(deleteConfirm.id)}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {(showAddPanel || showEditPanel) && (
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={() => {
              setShowAddPanel(false);
              setShowEditPanel(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AcademicCalendar;
