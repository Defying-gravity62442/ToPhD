'use client'

import { useState, useEffect } from 'react'
import { RoadmapItem } from '@/types/ai'

interface EditableMilestoneProps {
  milestone: RoadmapItem
  index: number
  onUpdate: (index: number, updated: RoadmapItem) => void
  onDelete: (index: number) => void
}

export default function EditableMilestone({ 
  milestone, 
  index, 
  onUpdate, 
  onDelete 
}: EditableMilestoneProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedMilestone, setEditedMilestone] = useState(milestone)

  // Sync editedMilestone with milestone prop when it changes
  useEffect(() => {
    setEditedMilestone(milestone)
  }, [milestone])

  const handleSave = () => {
    onUpdate(index, editedMilestone)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedMilestone(milestone)
    setIsEditing(false)
  }

  const handleDelete = () => {
    onDelete(index)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <input
              type="text"
              value={editedMilestone.action}
              onChange={(e) => setEditedMilestone({
                ...editedMilestone,
                action: e.target.value
              })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadline
            </label>
            <input
              type="text"
              value={editedMilestone.deadline}
              onChange={(e) => setEditedMilestone({
                ...editedMilestone,
                deadline: e.target.value
              })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={editedMilestone.notes}
              onChange={(e) => setEditedMilestone({
                ...editedMilestone,
                notes: e.target.value
              })}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
        {index + 1}
      </div>
      
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 mb-1">{milestone.action}</h3>
        <p className="text-sm text-gray-600 mb-2">Due: {milestone.deadline}</p>
        {milestone.notes && (
          <p className="text-sm text-gray-700">{milestone.notes}</p>
        )}
      </div>
      
      <button
        onClick={() => setIsEditing(true)}
        className="text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    </div>
  )
} 