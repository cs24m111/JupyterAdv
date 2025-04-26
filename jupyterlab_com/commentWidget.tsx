import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { Widget } from "@lumino/widgets";

export class CommentWidget extends Widget {
  constructor(cellId: string, username: string) {
    super();
    this.node.classList.add("jp-CommentsWidget");

    const container = document.createElement("div");
    container.id = `comment-${cellId}`;
    this.node.appendChild(container);

    const root = ReactDOM.createRoot(container);
    root.render(<CommentComponent cellId={cellId} username={username} />);
  }
}

const CommentComponent = ({ cellId, username }: { cellId: string; username: string }) => {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetch(`http://localhost:3001/api/comments/${cellId}`, {
      headers: { 'x-username': username }
    })
      .then(res => res.json())
      .then(data => setComments(data))
      .catch(err => console.error(`Error fetching comments for cell ${cellId}:`, err));
  }, [cellId, username]);

  const addComment = async () => {
    const commentText = newComment.trim();
    if (!commentText) return;

    const newCommentData = {
      comment: commentText,
      cellId,
      parentId: null
    };

    try {
      const response = await fetch('http://localhost:3001/api/add-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-username': username
        },
        body: JSON.stringify(newCommentData)
      });
      const data = await response.json();
      setComments([...comments, data]);
      setNewComment("");
    } catch (err) {
      console.error(`Failed to add comment for cell ${cellId}:`, err);
    }
  };

  return (
    <div style={{ padding: '10px' }}>
      <h3>COMMENTS </h3>
      <ul>
        {comments.map((comment) => (
          <li key={comment.id} style={{ borderBottom: '1px solid #eee', padding: '5px 0', marginLeft: comment.parentId ? '20px' : '0' }}>
            <strong>{comment.user || 'Unknown'}</strong> <em>({comment.timestamp})</em>: {comment.comment}
          </li>
        ))}
      </ul>
      <input
        type="text"
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder="Add a comment..."
        style={{ width: '100%', marginBottom: '10px', padding: '5px', border: '1px solid #ccc', borderRadius: '3px' }}
      />
      <button onClick={addComment} style={{ padding: '5px 10px', backgroundColor: '#0078d4', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
        Add
      </button>
    </div>
  );
};