class ParticipantRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.renderers = new Map();  // userId -> PoseRenderer
    }
    
    addParticipant(userId) {
        const canvas = document.createElement('canvas');
        this.container.appendChild(canvas);
        const renderer = new PoseRenderer(canvas);
        this.renderers.set(userId, renderer);
    }
    
    updatePose(userId, poseData) {
        const renderer = this.renderers.get(userId);
        if (renderer) {
            renderer.render(poseData);
        }
    }

    removeParticipant(userId) {
        const renderer = this.renderers.get(userId);
        if (renderer) {
            renderer.canvas.remove();  // 从DOM中移除canvas
            this.renderers.delete(userId);
        }
    }

    clear() {
        for (const [userId] of this.renderers) {
            this.removeParticipant(userId);
        }
        this.renderers.clear();
    }

    getParticipantCount() {
        return this.renderers.size;
    }

    hasParticipant(userId) {
        return this.renderers.has(userId);
    }

    resize() {
        for (const renderer of this.renderers.values()) {
            renderer.resize();
        }
    }
}

class PoseRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();  // 初始化大小
    }

    resize() {
        this.canvas.width = 640;  // 默认宽度
        this.canvas.height = 480; // 默认高度
    }

    render(poseData) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (poseData && poseData.keypoints) {
            this.drawKeypoints(poseData.keypoints);
            this.drawSkeleton(poseData.keypoints);
        }
    }

    drawKeypoints(keypoints) {
        this.ctx.fillStyle = '#00FF00';
        for (const point of keypoints) {
            if (point.score > 0.3) {  // 置信度阈值
                this.ctx.beginPath();
                this.ctx.arc(
                    point.x * this.canvas.width,
                    point.y * this.canvas.height,
                    5,  // 点的大小
                    0,
                    2 * Math.PI
                );
                this.ctx.fill();
            }
        }
    }

    drawSkeleton(keypoints) {
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        
        const connections = [
            [5, 7], [7, 9],   // 左臂
            [6, 8], [8, 10],  // 右臂
            [11, 13], [13, 15], // 左腿
            [12, 14], [14, 16], // 右腿
            [5, 6],   // 肩膀
            [11, 12], // 臀部
            [5, 11],  // 左躯干
            [6, 12]   // 右躯干
        ];

        for (const [i, j] of connections) {
            const pointA = keypoints[i];
            const pointB = keypoints[j];
            
            if (pointA.score > 0.3 && pointB.score > 0.3) {
                this.ctx.beginPath();
                this.ctx.moveTo(
                    pointA.x * this.canvas.width,
                    pointA.y * this.canvas.height
                );
                this.ctx.lineTo(
                    pointB.x * this.canvas.width,
                    pointB.y * this.canvas.height
                );
                this.ctx.stroke();
            }
        }
    }
}