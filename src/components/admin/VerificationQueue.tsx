import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  CheckCircle, XCircle, AlertCircle, 
  Clock, User, FileText 
} from 'lucide-react';
import type { VerificationRequest } from '../../types';

interface VerificationQueueProps {
  requests: VerificationRequest[];
  onRefresh: () => void;
}

export const VerificationQueue: React.FC<VerificationQueueProps> = ({ 
  requests, 
  onRefresh 
}) => {
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [verificationNote, setVerificationNote] = useState('');

  const handleVerification = async (
    requestId: string, 
    status: 'approved' | 'rejected',
    note: string
  ) => {
    try {
      // Update verification request
      const { error: updateError } = await supabase
        .from('verification_requests')
        .update({ 
          status,
          admin_note: note,
          verified_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // If approved, update user status
      if (status === 'approved') {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          const { error: userError } = await supabase
            .from('users')
            .update({ is_verified: true })
            .eq('id', request.user_id);

          if (userError) throw userError;
        }
      }

      // Create verification log
      await supabase
        .from('verification_logs')
        .insert({
          request_id: requestId,
          status,
          note,
          admin_id: (await supabase.auth.getUser()).data.user?.id
        });

      setSelectedRequest(null);
      setVerificationNote('');
      onRefresh();
    } catch (error) {
      console.error('Error processing verification:', error);
      alert('Failed to process verification. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {requests.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No pending verification requests
          </div>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className="bg-gray-800 rounded-lg p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <h3 className="font-medium">{request.user_email}</h3>
                    <p className="text-sm text-gray-400">
                      Submitted {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {request.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600"
                      >
                        Review
                      </button>
                    </>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${request.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'}`}
                    >
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <h4 className="text-sm font-medium mb-2">Verification Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(request.verification_data || {}).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-gray-400">{key}: </span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Verification Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-medium mb-6">Review Verification Request</h3>
            
            <div className="space-y-6">
              {/* User Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">User Information</h4>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-400">Email: </span>
                      <span>{selectedRequest.user_email}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Submitted: </span>
                      <span>{new Date(selectedRequest.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Checklist */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Verification Checklist</h4>
                <div className="space-y-2">
                  {[
                    'Valid email domain',
                    'Complete profile information',
                    'Acceptable use policy agreement',
                    'Required documents provided'
                  ].map((item, index) => (
                    <label key={index} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Admin Note */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Admin Note</h4>
                <textarea
                  value={verificationNote}
                  onChange={(e) => setVerificationNote(e.target.value)}
                  placeholder="Add a note about this verification decision..."
                  className="w-full bg-gray-700 rounded-lg px-4 py-2 h-24 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleVerification(
                    selectedRequest.id,
                    'rejected',
                    verificationNote
                  )}
                  className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-600"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleVerification(
                    selectedRequest.id,
                    'approved',
                    verificationNote
                  )}
                  className="px-4 py-2 bg-green-500 rounded-lg hover:bg-green-600"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};