'use client'

import React, { useState, useEffect } from 'react';
import CalendarIntegration from './CalendarIntegration';

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  syncEnabled?: boolean;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  milestones: Milestone[];
}

interface RoadmapProps {
  goals: Goal[];
  expandedGoalId: string | null;
  onExpandedGoalChange: (goalId: string | null) => void;
  onMilestoneToggle?: (milestoneId: string, completed: boolean) => void;
  onGoalUpdate?: (goalId: string, updates: Partial<Goal>) => void;
  onGoalDelete?: (goalId: string) => void;
  onMilestoneUpdate?: (goalId: string, milestoneId: string, updates: Partial<Milestone>) => void;
  onMilestoneDelete?: (goalId: string, milestoneId: string) => void;
  syncEnabledMap: Record<string, boolean>;
  onSyncEnabledChange: (milestoneId: string, enabled: boolean) => void;
}

const getProgressPercentage = (milestones: Milestone[]) => {
  if (milestones.length === 0) return 0;
  const completed = milestones.filter(m => m.completed).length;
  return Math.round((completed / milestones.length) * 100);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-gray-100 text-gray-800';
    case 'completed':
      return 'bg-gray-100 text-gray-800';
    case 'paused':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const sortMilestones = (milestones: Milestone[]) => {
  return [...milestones].sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return a.title.localeCompare(b.title);
  });
};

export default function Roadmap({
  goals,
  expandedGoalId,
  onExpandedGoalChange,
  onMilestoneToggle,
  onGoalUpdate,
  onGoalDelete,
  onMilestoneUpdate,
  onMilestoneDelete,

}: RoadmapProps) {
  // Remove internal expandedGoal state
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    title?: string;
    description?: string;
    status?: string;
    dueDate?: string;
  }>({});

  // Remember the expanded goal across prop changes
  useEffect(() => {
    if (expandedGoalId && goals.some(g => g.id === expandedGoalId)) {
      // setExpandedGoal(expandedGoalId); // This line is removed
    } else {
      onExpandedGoalChange(null);
    }
  }, [goals, expandedGoalId, onExpandedGoalChange]);

  const handleToggleGoal = (goalId: string) => {
    onExpandedGoalChange(expandedGoalId === goalId ? null : goalId);
  };

  const startGoalEdit = (goal: Goal) => {
    setEditingGoal(goal.id);
    setEditData({
      title: goal.title,
      status: goal.status,
    });
  };

  const saveGoalEdit = () => {
    if (!editingGoal || !onGoalUpdate) return;
    onGoalUpdate(editingGoal, {
      title: editData.title,
      status: editData.status,
    });
    setEditingGoal(null);
    setEditData({});
  };

  const cancelGoalEdit = () => {
    setEditingGoal(null);
    setEditData({});
  };

  const startMilestoneEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone.id);
    setEditData({
      title: milestone.title,
      description: milestone.description || '',
      dueDate: milestone.dueDate || '',
    });
  };

  const saveMilestoneEdit = (goalId: string) => {
    if (!editingMilestone || !onMilestoneUpdate) return;
    onMilestoneUpdate(goalId, editingMilestone, {
      title: editData.title,
      description: editData.description,
      dueDate: editData.dueDate || null,
    });
    setEditingMilestone(null);
    setEditData({});
  };

  const cancelMilestoneEdit = () => {
    setEditingMilestone(null);
    setEditData({});
  };

  if (goals.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
        <p className="text-gray-500 mb-4">Create your first academic goal to get started</p>
        <a
          href="/create-goal"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
        >
          Create Goal
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {goals.map((goal) => {
        const progress = getProgressPercentage(goal.milestones);
        const isExpanded = expandedGoalId === goal.id;
        const isEditingGoal = editingGoal === goal.id;
        return (
          <div key={goal.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {isEditingGoal ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Goal Title
                        </label>
                        <input
                          type="text"
                          value={editData.title}
                          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        >
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveGoalEdit}
                          className="px-3 py-1 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelGoalEdit}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(goal.status)}`}>
                          {goal.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">Progress</span>
                            <span className="text-sm font-bold text-gray-900">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gray-800 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {goal.milestones.filter(m => m.completed).length} of {goal.milestones.length} completed
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="ml-4 flex items-center space-x-2">
                  {!isEditingGoal && (
                    <>
                      <button
                        type="button"
                        onClick={() => startGoalEdit(goal)}
                        className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                        title="Edit goal"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {onGoalDelete && (
                        <button
                          type="button"
                          onClick={() => onGoalDelete(goal.id)}
                          className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                          title="Delete goal"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleGoal(goal.id)}
                    className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                  >
                    <svg 
                      className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {isExpanded && (
              <div className="border-t border-gray-200 bg-gray-50">
                <div className="p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Milestones</h4>
                  <div className="space-y-3">
                    {goal.milestones.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No milestones yet</p>
                    ) : (
                      sortMilestones(goal.milestones).map((milestone) => (
                        <div key={milestone.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200">
                          <div className="flex-shrink-0 mt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                onMilestoneToggle?.(milestone.id, !milestone.completed);
                              }}
                              className="focus:outline-none focus:ring-2 focus:ring-gray-400 rounded-full"
                              disabled={!!editingMilestone}
                            >
                              {milestone.completed ? (
                                <div className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-5 h-5 border-2 border-gray-300 rounded-full hover:border-gray-400 transition-colors"></div>
                              )}
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            {editingMilestone === milestone.id ? (
                              <div className="space-y-2">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Title
                                  </label>
                                  <input
                                    type="text"
                                    value={editData.title}
                                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Description
                                  </label>
                                  <textarea
                                    value={editData.description}
                                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                    rows={2}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Due Date
                                  </label>
                                  <input
                                    type="date"
                                    value={editData.dueDate}
                                    onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => saveMilestoneEdit(goal.id)}
                                    className="px-2 py-1 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-xs"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelMilestoneEdit}
                                    className="px-2 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between">
                                  <h5 className={`text-sm font-medium ${milestone.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>{milestone.title}</h5>
                                  <div className="flex items-center space-x-1">
                                    {/* CalendarIntegration can be re-added here if needed */}
                                    <button
                                      type="button"
                                      onClick={() => startMilestoneEdit(milestone)}
                                      className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                                      title="Edit milestone"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    {onMilestoneDelete && (
                                      <button
                                        type="button"
                                        onClick={() => onMilestoneDelete(goal.id, milestone.id)}
                                        className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                                        title="Delete milestone"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {milestone.dueDate && (
                                  <span className="text-xs text-gray-500">
                                    Due: {milestone.dueDate || ''}
                                  </span>
                                )}
                                {milestone.description && (
                                  <p className={`text-xs mt-1 ${milestone.completed ? 'text-gray-400' : 'text-gray-600'}`}>{milestone.description}</p>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            {/* Always show the CalendarIntegration button if not editingMilestone and milestone has a due date */}
                            {!editingMilestone && milestone.dueDate && (
                              <CalendarIntegration
                                milestoneId={milestone.id}
                                goalId={goal.id}
                                goalTitle={goal.title}
                                milestoneTitle={milestone.title}
                                milestoneDescription={milestone.description}
                                dueDate={milestone.dueDate || ''}
                              />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}