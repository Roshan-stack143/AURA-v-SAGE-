import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, MessageSquare, Send, Image as ImageIcon, 
  MoreVertical, User, ArrowLeft, Share2, Sparkles,
  X, Camera
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, orderBy, onSnapshot, 
  addDoc, serverTimestamp, updateDoc, doc,
  arrayUnion, arrayRemove
} from 'firebase/firestore';

export default function Community() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostCaption, setNewPostCaption] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<{ [key: string]: any[] }>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'posts');
    });
    return () => unsubscribe();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setNewPostImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPostCaption.trim()) return;

    try {
      const postData: any = {
        userId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || '',
        caption: newPostCaption,
        likes: [],
        createdAt: serverTimestamp()
      };

      if (newPostImage) {
        postData.imageUrl = newPostImage;
      }

      await addDoc(collection(db, 'posts'), postData);
      setNewPostCaption('');
      setNewPostImage('');
      setShowUploadModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;
    const postRef = doc(db, 'posts', postId);
    try {
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'posts');
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!user || !newComment.trim()) return;
    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        postId,
        userId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || '',
        text: newComment,
        createdAt: serverTimestamp()
      });
      setNewComment('');
      setCommentingOn(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'comments');
    }
  };

  // Fetch comments for a specific post when it's opened
  useEffect(() => {
    if (!commentingOn) return;
    const q = query(collection(db, 'posts', commentingOn, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComments(prev => ({ ...prev, [commentingOn]: commentsData }));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'comments');
    });
    return () => unsubscribe();
  }, [commentingOn]);

  return (
    <div className="min-h-screen bg-deep-blue text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/10 rounded-full transition-all">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="text-accent-orange" /> Community Feed
          </h1>
        </div>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="bg-accent-orange text-white px-6 py-2 rounded-full font-bold hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
        >
          <Camera size={20} /> Share Moment
        </button>
      </div>

      {/* Feed */}
      <div className="max-w-2xl mx-auto space-y-8">
        <AnimatePresence>
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card overflow-hidden border-white/10"
            >
              {/* Post Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden border border-white/20">
                    {post.authorPhoto ? (
                      <img src={post.authorPhoto} alt={post.authorName} className="w-full h-auto" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={20} className="text-white/40" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-white">{post.authorName}</p>
                    <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">
                      {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </p>
                  </div>
                </div>
                <button className="p-2 text-white/40 hover:text-white transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>

              {/* Post Image */}
              {post.imageUrl && (
                <div className="aspect-video bg-black/20 relative overflow-hidden">
                  <img 
                    src={post.imageUrl} 
                    alt="Post content" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Post Content */}
              <div className="p-6 space-y-4">
                <p className="text-white/90 leading-relaxed text-lg font-medium whitespace-pre-wrap">
                  {post.caption.split(/(#[a-zA-Z0-9_]+)/g).map((part: string, i: number) => 
                    part.startsWith('#') ? (
                      <span key={i} className="text-accent-orange">{part}</span>
                    ) : (
                      part
                    )
                  )}
                </p>

                {/* Interactions */}
                <div className="flex items-center gap-6 pt-4 border-t border-white/10">
                  <button 
                    onClick={() => handleLike(post.id, post.likes?.includes(user?.uid))}
                    className={`flex items-center gap-2 transition-all ${post.likes?.includes(user?.uid) ? 'text-red-500' : 'text-white/80 hover:text-white'}`}
                  >
                    <Heart size={20} fill={post.likes?.includes(user?.uid) ? "currentColor" : "none"} />
                    <span className="text-sm font-bold">{post.likes?.length || 0}</span>
                  </button>
                  <button 
                    onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                    className="flex items-center gap-2 text-white/80 hover:text-white transition-all"
                  >
                    <MessageSquare size={20} />
                    <span className="text-sm font-bold">Comments</span>
                  </button>
                  <button className="flex items-center gap-2 text-white/80 hover:text-white transition-all ml-auto">
                    <Share2 size={20} />
                  </button>
                </div>

                {/* Comments Section */}
                <AnimatePresence>
                  {commentingOn === post.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pt-4"
                    >
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {comments[post.id]?.map((comment: any) => (
                          <div key={comment.id} className="bg-white/10 p-3 rounded-xl border border-white/10">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-bold text-accent-orange">{comment.authorName}</p>
                              <p className="text-[8px] text-white/60 font-bold uppercase">
                                {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleTimeString() : 'Just now'}
                              </p>
                            </div>
                            <p className="text-sm text-white font-medium">{comment.text}</p>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-accent-orange transition-all"
                        />
                        <button 
                          onClick={() => handleAddComment(post.id)}
                          className="p-2 bg-accent-orange rounded-full hover:bg-orange-600 transition-all"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-lg relative z-10 p-8 border-white/20"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Share Your Journey</h2>
                <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-white uppercase tracking-widest mb-2">Caption</label>
                  <textarea 
                    required
                    value={newPostCaption}
                    onChange={(e) => setNewPostCaption(e.target.value)}
                    placeholder="Tell the community about your experience..."
                    className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 min-h-[120px] focus:outline-none focus:border-accent-orange transition-all text-white placeholder:text-white/50 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white uppercase tracking-widest mb-2">Image (Optional)</label>
                  <div className="flex flex-col gap-4">
                    <label className="flex items-center justify-center w-full h-32 px-4 transition bg-white/5 border-2 border-white/10 border-dashed rounded-2xl appearance-none cursor-pointer hover:border-accent-orange focus:outline-none">
                      <div className="flex flex-col items-center space-y-2">
                        <ImageIcon size={24} className="text-white/40" />
                        <span className="font-medium text-white/60">
                          Click to upload an image
                        </span>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    {newPostImage && (
                      <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-white/10">
                        <img src={newPostImage} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewPostImage('')}
                          className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-accent-orange text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                >
                  Post to Community
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
