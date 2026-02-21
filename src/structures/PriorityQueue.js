class PriorityQueue {
    constructor() {
        this.queue = [];
    }

    enqueue(job) {
        this.queue.push(job);
        this.bubbleUp();
    }

    dequeue() {
        if (this.isEmpty()) return null;
        if (this.queue.length === 1) return this.queue.pop();

        const minJob = this.queue[0];
        this.queue[0] = this.queue.pop();
        this.sinkDown(0);

        return minJob;
    }

    isEmpty() {
        return this.queue.length === 0;
    }

    bubbleUp() {
        let index = this.queue.length - 1;
        while (index > 0) {
            let parentIndex = Math.floor((index - 1) / 2);
            if (this.queue[index].limit >= this.queue[parentIndex].limit) break;
            this.swap(index, parentIndex);
            index = parentIndex;
        }
    }

    sinkDown(index) {
        const length = this.queue.length;
        let smallest = index;
        let leftChild = 2 * index + 1;
        let rightChild = 2 * index + 2;

        if (leftChild < length && this.queue[leftChild].limit < this.queue[smallest].limit) {
            smallest = leftChild;
        }

        if (rightChild < length && this.queue[rightChild].limit < this.queue[smallest].limit) {
            smallest = rightChild;
        }

        if (smallest !== index) {
            this.swap(index, smallest);
            this.sinkDown(smallest);
        }
    }

    swap(i, j) {
        let temp = this.queue[i];
        this.queue[i] = this.queue[j];
        this.queue[j] = temp;
    }
}

module.exports = PriorityQueue;
