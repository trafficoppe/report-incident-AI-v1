let finalBlurredBase64 = '';
let baseCanvasSnapshot = null; // 🌟 ตัวแปรใหม่: ใช้จดจำภาพหลังจากที่ AI เบลอหน้าเสร็จแล้ว (ก่อนเราคลิกเอง)

document.getElementById('incidentImage').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    const submitBtn = document.getElementById('submitBtn');
    
    submitBtn.innerText = "กำลังให้ Vision API ตรวจจับใบหน้า...";
    submitBtn.disabled = true;

    const img = new Image();
    img.onload = async () => {
        const maxWidth = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
            height = Math.round(height * maxWidth / width);
            width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.style.display = 'block'; 

        const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        try {
            const apiKey = CONFIG.VISION_API_KEY; 
            const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
            
            const payload = {
                "requests": [
                    {
                        "image": { "content": base64Data },
                        "features": [ { "type": "FACE_DETECTION" } ]
                    }
                ]
            };

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (result.error) throw new Error(result.error.message);

            const faces = result.responses[0].faceAnnotations;

            if (faces && faces.length > 0) {
                faces.forEach(face => {
                    const vertices = face.boundingPoly.vertices;
                    const xCoords = vertices.map(v => v.x || 0);
                    const yCoords = vertices.map(v => v.y || 0);
                    const x = Math.min(...xCoords);
                    const y = Math.min(...yCoords);
                    const w = Math.max(...xCoords) - x;
                    const h = Math.max(...yCoords) - y;

                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(x, y, w, h);
                    ctx.clip();
                    ctx.filter = 'blur(20px)';
                    ctx.drawImage(canvas, 0, 0); 
                    ctx.restore();
                });
                
                Swal.fire({
                    icon: 'success',
                    title: 'เบลอใบหน้าสำเร็จ!',
                    text: 'ระบบทำการปกปิดข้อมูลส่วนบุคคลให้เรียบร้อยครับ',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                Swal.fire({
                    icon: 'info',
                    title: 'ไม่พบใบหน้า',
                    text: 'ระบบวิเคราะห์ไม่พบใบหน้าที่ชัดเจนในภาพนี้',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error("Vision API Error:", error);
            Swal.fire({
                icon: 'warning',
                title: 'ระบบเซ็นเซอร์ขัดข้อง',
                text: 'ไม่สามารถติดต่อ Vision API ได้ (แต่ยังกดส่งข้อมูลได้ปกตินะครับ)'
            });
        } finally {
            // 🌟 1. บันทึกรูปภาพล่าสุดเตรียมส่งเข้า Google Sheet
            finalBlurredBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            
            // 🌟 2. ถ่าย Snapshot รูปภาพเก็บไว้เป็นจุด Checkpoint เผื่อผู้ใช้กดถังขยะย้อนกลับ
            baseCanvasSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

            submitBtn.innerText = "ส่งรายงาน";
            submitBtn.disabled = false;
        }
    };
    img.src = URL.createObjectURL(file);
});

// ฟังก์ชันเสริม: คลิกลงบนรูปเพื่อเบลอเพิ่มเอง ในกรณีที่ AI จับไม่เจอ
document.getElementById('imageCanvas').addEventListener('click', function(event) {
    const canvas = this;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // คำนวณพิกัดเมาส์/นิ้ว ให้ตรงกับสเกลจริงของรูปภาพ
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // ดึงขนาดความกว้าง-ยาวของกรอบเบลอจากแถบเลื่อน (Slider)
    let blurSize = 100; 
    const slider = document.getElementById('blurSizeRange');
    if (slider) {
        blurSize = parseInt(slider.value);
    }

    // วาดกรอบเบลอทับลงไปตรงจุดที่คลิก
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - (blurSize / 2), y - (blurSize / 2), blurSize, blurSize);
    ctx.clip();
    ctx.filter = 'blur(20px)';
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();

    // อัปเดตไฟล์ภาพล่าสุดที่ถูกเบลอเพิ่ม เพื่อเตรียมส่ง
    finalBlurredBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
});

// 🌟 ฟังก์ชันใหม่: รีเซ็ตการเบลอที่คลิกเอง (ดึง Snapshot เดิมกลับมาทับ)
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'btnResetBlur') {
        const canvas = document.getElementById('imageCanvas');
        const ctx = canvas.getContext('2d');
        
        if (baseCanvasSnapshot) {
            // เทรูปภาพจาก Snapshot เดิม (ภาพตอน AI เพิ่งทำเสร็จ) กลับคืนมา
            ctx.putImageData(baseCanvasSnapshot, 0, 0);
            
            // อัปเดตไฟล์ Base64 ใหม่ให้กลับเป็นเวอร์ชันเดิม
            finalBlurredBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            
            Swal.fire({
                icon: 'success',
                title: 'คืนค่ารูปภาพสำเร็จ',
                text: 'ล้างจุดที่คลิกเบลอเองเรียบร้อยแล้วครับ',
                timer: 1500,
                showConfirmButton: false
            });
        }
    }
});