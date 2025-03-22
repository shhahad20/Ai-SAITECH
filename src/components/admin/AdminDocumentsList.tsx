import React, { useEffect, useState } from "react";
import { Loader2, Trash2, FileText } from "lucide-react";
import { Document } from "../../types";
import { deleteDocument, getDocuments } from "../../lib/documents";
// import { useNavigation } from "../../lib/sections";

interface AdminDocumentsListProps {
  isAdmin: boolean;
  //   onEdit: (doc: Document) => void;
}

export const AdminDocumentsList: React.FC<AdminDocumentsListProps> = ({
  isAdmin,
}) => {
    // const { sections } = useNavigation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
//   const [editingDoc, setEditingDoc] = useState<Document | null>(null);
//   const [editForm, setEditForm] = useState({
//     name: '',
//     summary: '',
//     tags: '',
//     sectionId: '',
//     subSectionId: ''
//   });

//   useEffect(() => {
//     if (editingDoc) {
//       setEditForm({
//         name: editingDoc.name,
//         summary: editingDoc.summary || '',
//         tags: editingDoc.metadata?.tags?.join(', ') || '',
//         sectionId: editingDoc.metadata?.section || '',
//         subSectionId: editingDoc.sub_section_id || ''
//       });
//     }
//   }, [editingDoc]);

//   const handleUpdate = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!editingDoc) return;

//     try {
//       const updates = {
//         name: editForm.name.trim(),
//         summary: editForm.summary.trim(),
//         metadata: {
//           ...editingDoc.metadata,
//           tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
//           section: editForm.sectionId,
//         },
//         sub_section_id: editForm.subSectionId
//       };

//       const updatedDoc = await updateDocument(editingDoc.id, updates);
//       setDocuments(docs => docs.map(d => d.id === updatedDoc.id ? updatedDoc : d));
//       setEditingDoc(null);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Failed to update document');
//     }
//   };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const docs = await getDocuments();
      setDocuments(docs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this document?"))
      return;

    try {
      await deleteDocument(id);
      setDocuments((docs) => docs.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-500/10 rounded-lg">{error}</div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((document) => (
        <div
          key={document.id}
          className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
        >
          <div className="flex items-center gap-4">
            <FileText className="w-6 h-6 text-gray-400" />
            <div>
              <h3 className="font-medium text-gray-200">{document.name}</h3>
              <p className="text-sm text-gray-400">{document.summary}</p>
              <p className="text-sm text-gray-400">{document.created_at}</p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex gap-2">
              {/* <button
                onClick={() => setEditingDoc(document)}
                className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg"
              >
                <Edit className="w-5 h-5" />
              </button> */}
              <button
                onClick={() => handleDelete(document.id)}
                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      ))}
     {/* Edit Modal */}
     {/* {editingDoc && (
        <Dialog open={true} onClose={() => setEditingDoc(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Dialog.Panel className="w-full max-w-md p-6 rounded-lg bg-gray-800">
            <Dialog.Title className="text-xl font-bold mb-4">Edit Document</Dialog.Title>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-gray-700 rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Summary</label>
                <textarea
                  value={editForm.summary}
                  onChange={(e) => setEditForm({...editForm, summary: e.target.value})}
                  className="w-full bg-gray-700 rounded px-3 py-2 h-24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({...editForm, tags: e.target.value})}
                  className="w-full bg-gray-700 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Section</label>
                <select
                  value={editForm.sectionId}
                  onChange={(e) => setEditForm({...editForm, sectionId: e.target.value, subSectionId: ''})}
                  className="w-full bg-gray-700 rounded px-3 py-2"
                >
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>{section.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sub-section</label>
                <select
                  value={editForm.subSectionId}
                  onChange={(e) => setEditForm({...editForm, subSectionId: e.target.value})}
                  className="w-full bg-gray-700 rounded px-3 py-2"
                >
                  {sections
                    .find(s => s.id === editForm.sectionId)
                    ?.sub_sections?.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </Dialog>
      )} */}
    </div>
  );
};
