"use client";
import { useState, useRef, useEffect } from "react";
import { Upload, Trash2, GripVertical, X as XIcon } from "lucide-react";
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

const API_BASE = "http://localhost:5000/api/results";

// --- Sortable Item Component ---
const SortableResultItem = ({ pdf, startEditing, showDeleteConfirmation }) => {
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
      className={`border-b-4 border-orange-400 rounded-lg p-4 shadow-lg bg-white group ${
        isDragging ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex items-start space-x-4 overflow-hidden">
        <div className="flex-shrink-0">
          <div className="w-14 h-16 rounded-lg flex items-center justify-center border border-orange-400">
            <FaRegFilePdf className="text-orange-400 w-8 h-8" />
          </div>
        </div>
        <div className="flex-grow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-800 truncate">{pdf.name}</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Uploaded: {pdf.uploadDate}
              </div>
              <div className="flex items-center space-x-2">
                {/* DRAG HANDLE GROUPED WITH ACTIONS */}
                <div
                  {...attributes}
                  {...listeners}
                  className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded-lg"
                  title="Drag to reorder"
                >
                  <GripVertical size={16} />
                </div>

                <button
                  onClick={() => startEditing(pdf)}
                  className="text-blue-600 bg-blue-200 hover:bg-blue-100 rounded-2xl p-1"
                  title="Edit result"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => showDeleteConfirmation(pdf.id, pdf.name)}
                  className="text-red-600 bg-red-200 hover:bg-red-100 rounded-2xl p-1"
                  title="Delete result"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Result = () => {
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
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_BASE);
      const formatted = response.data.map((item) => ({
        id: item.id,
        name: item.title,
        size: item.file_size,
        uploadDate: new Date(item.uploaded_at).toLocaleDateString(),
        pdfPath: item.pdf_path,
      }));
      setPdfFiles(formatted);
    } catch (err) {
      console.error("Error fetching results:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
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
        await axios.post(`${API_BASE}/reorder`, { sequence: sequenceData });
      } catch (error) {
        fetchResults(); // Revert on failure
      }
    }
  };

  const handleUploadClick = async () => {
    if (selectedFile) {
      const data = new FormData();
      data.append(
        "title",
        fileName || selectedFile.name.replace(/\.pdf$/i, ""),
      );
      data.append("pdfFile", selectedFile);
      try {
        await axios.post(API_BASE, data);
        fetchResults();
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
    const data = new FormData();
    data.append("title", editValue.trim());
    if (newFile) data.append("pdfFile", newFile);
    try {
      await axios.put(`${API_BASE}/${editingFile.id}`, data);
      fetchResults();
      cancelEdit();
    } catch (err) {
      alert("Update failed");
    }
  };

  const removeFile = async (id) => {
    try {
      await axios.delete(`${API_BASE}/${id}`);
      setPdfFiles((prev) => prev.filter((file) => file.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert("Delete failed");
    }
  };

  // UI Helper Functions
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

  const startEditing = (file) => {
    setEditingFile(file);
    setEditValue(file.name);
    setNewFile(null);
    setShowEditPanel(true);
  };
  const cancelEdit = () => {
    setShowEditPanel(false);
    setEditingFile(null);
  };
  const handleCancelAdd = () => {
    setSelectedFile(null);
    setFileName("");
    setShowAddPanel(false);
  };
  const showDeleteConfirmation = (id, name) => setDeleteConfirm({ id, name });

  if (loading)
    return <div className="p-20 text-center font-bold">Loading Results...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 relative overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Result
          </h1>
          <button
            id="add-button"
            onClick={() => setShowAddPanel(true)}
            className="bg-blue-400/30 text-blue-950 font-medium py-2 px-4 rounded-3xl flex items-center transition-colors"
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
                <SortableResultItem
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

        {/* Modal Panels (Keep your original UI structure here) */}
        {showAddPanel && (
          <div
            id="add-panel"
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-semibold">Upload Result</h2>
              <button onClick={handleCancelAdd}>
                <XIcon className="text-gray-400" />
              </button>
            </div>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="File Name"
              className="w-full p-3 border rounded-lg mb-6"
            />
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer border-gray-300"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p>{selectedFile ? selectedFile.name : "Drop PDF here"}</p>
              <input
                type="file"
                ref={fileInputRef}
                hidden
                accept=".pdf"
                onChange={handleFileSelect}
              />
            </div>
            <div className="mt-auto flex space-x-3">
              <button
                onClick={handleCancelAdd}
                className="flex-1 py-3 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadClick}
                disabled={!selectedFile}
                className="flex-1 py-3 bg-blue-400/30 text-blue-950 font-bold rounded-lg"
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
              <h2 className="text-xl font-semibold">Edit Result</h2>
              <button onClick={cancelEdit}>
                <XIcon className="text-gray-400" />
              </button>
            </div>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full p-3 border rounded-lg mb-6"
            />
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer border-gray-300"
              onClick={() => editFileInputRef.current?.click()}
            >
              <Upload className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-sm">
                {newFile ? newFile.name : "Replace PDF (optional)"}
              </p>
              <input
                type="file"
                ref={editFileInputRef}
                hidden
                accept=".pdf"
                onChange={(e) => setNewFile(e.target.files[0])}
              />
            </div>
            <div className="mt-auto flex space-x-3">
              <button
                onClick={cancelEdit}
                className="flex-1 py-3 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 py-3 bg-blue-400/30 text-blue-950"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl text-center">
              <Trash2 className="mx-auto text-red-600 mb-4 w-12 h-12" />
              <p className="mb-6 font-medium">Delete "{deleteConfirm.name}"?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeFile(deleteConfirm.id)}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {(showAddPanel || showEditPanel) && (
          <div
            className="fixed inset-0 bg-black/40 z-40"
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

const Edit2 = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

export default Result;
