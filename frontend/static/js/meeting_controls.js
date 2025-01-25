class MeetingControls {
    constructor(config) {
        this.roomId = null;
        this.userId = null;
        this.participants = new Map();
        this.localPoseStream = null;
        this.jitsiConnection = null;
        this.dataChannel = null;
        this.config = config;
        
        // UI elements
        this.initializeUI();
    }
    
    initializeUI() {
        // 初始化UI元素
        this.controls = {
            createBtn: document.getElementById('create-meeting-btn'),
            joinBtn: document.getElementById('join-meeting-btn'),
            leaveBtn: document.getElementById('leave-meeting-btn'),
            roomInput: document.getElementById('room-id-input')
        };

        // 绑定事件处理
        this.controls.createBtn?.addEventListener('click', () => this.createMeeting());
        this.controls.joinBtn?.addEventListener('click', () => {
            const roomId = this.controls.roomInput.value;
            if (roomId) this.joinMeeting(roomId);
        });
        this.controls.leaveBtn?.addEventListener('click', () => this.leaveMeeting());
    }
    
    async createMeeting() {
        try {
            const response = await fetch('/api/meeting/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: this.userId })
            });
            
            const data = await response.json();
            if (data.success) {
                await this.joinMeeting(data.room_id);
                return data.room_id;
            } else {
                throw new Error(data.error || '创建会议失败');
            }
        } catch (error) {
            console.error('创建会议失败:', error);
            throw error;
        }
    }
    
    async joinMeeting(roomId) {
        try {
            const response = await fetch('/api/meeting/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: roomId,
                    user_id: this.userId
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.roomId = roomId;
                await this.initializeJitsiConnection();
                this.startLocalPoseStream();
                this.updateUIForActiveSession();
            } else {
                throw new Error(data.error || '加入会议失败');
            }
        } catch (error) {
            console.error('加入会议失败:', error);
            throw error;
        }
    }

    async initializeJitsiConnection() {
        this.jitsiConnection = new JitsiConnection(this.config.jitsiServer);
        await this.jitsiConnection.connect();
        this.dataChannel = await this.jitsiConnection.createDataChannel(this.roomId);
        this.setupDataChannelHandlers();
    }

    setupDataChannelHandlers() {
        this.dataChannel.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'pose_update') {
                this.handlePoseUpdate(message);
            }
        };
    }

    startLocalPoseStream() {
        this.localPoseStream = setInterval(() => {
            const poseData = this.captureLocalPose();
            this.broadcastPose(poseData);
        }, 1000 / this.config.fps);
    }

    captureLocalPose() {
        // 实现姿态捕捉逻辑
        return {};
    }

    async broadcastPose(poseData) {
        if (!this.dataChannel) return;
        
        const message = {
            type: 'pose_update',
            user_id: this.userId,
            pose_data: poseData,
            timestamp: Date.now()
        };

        try {
            await this.dataChannel.send(JSON.stringify(message));
        } catch (error) {
            console.error('发送姿态数据失败:', error);
        }
    }

    handlePoseUpdate(message) {
        const { user_id, pose_data } = message;
        if (user_id !== this.userId) {
            this.participants.get(user_id)?.updatePose(pose_data);
        }
    }

    async leaveMeeting() {
        if (this.localPoseStream) {
            clearInterval(this.localPoseStream);
        }
        
        if (this.dataChannel) {
            this.dataChannel.close();
        }
        
        if (this.jitsiConnection) {
            await this.jitsiConnection.disconnect();
        }

        this.roomId = null;
        this.updateUIForInactiveSession();
    }

    updateUIForActiveSession() {
        if (this.controls.createBtn) this.controls.createBtn.disabled = true;
        if (this.controls.joinBtn) this.controls.joinBtn.disabled = true;
        if (this.controls.leaveBtn) this.controls.leaveBtn.disabled = false;
        if (this.controls.roomInput) this.controls.roomInput.disabled = true;
    }

    updateUIForInactiveSession() {
        if (this.controls.createBtn) this.controls.createBtn.disabled = false;
        if (this.controls.joinBtn) this.controls.joinBtn.disabled = false;
        if (this.controls.leaveBtn) this.controls.leaveBtn.disabled = true;
        if (this.controls.roomInput) this.controls.roomInput.disabled = false;
    }
}