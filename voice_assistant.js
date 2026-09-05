// ==========================================
// ไฟล์: voice_assistant.js
// หน้าที่: จับเสียงพูด ส่งไปให้หลังบ้าน และ Auto-fill ข้อมูล (อัปเดตแก้บั๊กหมุนค้าง)
// ==========================================

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'th-TH'; // รับภาษาไทย
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
}

function startAIVoice() {
    if (!recognition) {
        Swal.fire('ขออภัย', 'เบราว์เซอร์ หรือ แอปพลิเคชันที่คุณใช้อยู่ (เช่น LINE) ไม่รองรับระบบสั่งการด้วยเสียง แนะนำให้เปิดใน Google Chrome หรือ Safari ครับ', 'warning');
        return;
    }

    let isProcessing = false;

    // เด้งหน้าต่างรอรับเสียง พร้อมปุ่มยกเลิก
    Swal.fire({
        title: '🎙️ ระบบกำลังฟัง...',
        html: `โปรดพูดรายละเอียดเหตุการณ์ได้เลยครับ<br>
               <span style="font-size:13px; color:#666;">(เช่น "มีรถเก๋งชนมอไซค์ หน้าประตู 1 คนเจ็บ 1 คน")</span><br><br>
               <span style="font-size:12px; color:#d32f2f;">*หากมีแถบเด้งถามด้านบนเบราว์เซอร์ กรุณากด <b>"อนุญาต" (Allow)</b> ให้ใช้ไมโครโฟนด้วยครับ*</span>`,
        showCancelButton: true,
        cancelButtonText: 'ยกเลิก',
        showConfirmButton: false,
        allowOutsideClick: false,
        didOpen: () => { 
            Swal.showLoading(); 
            try {
                recognition.start();
            } catch(e) {
                console.error("เริ่มไมค์ไม่ได้: ", e);
            }
        }
    }).then((result) => {
        // ถ้าผู้ใช้กดปุ่มยกเลิก ให้หยุดการฟังทันที
        if (result.dismiss === Swal.DismissReason.cancel) {
            recognition.stop();
        }
    });

    // เมื่อได้ยินเสียงพูดจนจบประโยค
    recognition.onresult = async (event) => {
        isProcessing = true;
        const transcript = event.results[0][0].transcript;
        
        Swal.fire({
            title: '🧠 AI กำลังวิเคราะห์ข้อมูล...',
            text: `สิ่งที่คุณพูด: "${transcript}"`,
            showConfirmButton: false,
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'parseVoice', message: transcript })
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                fillFormWithVoiceData(result.data);
                Swal.fire('✅ สำเร็จ!', 'AI ช่วยเลือกข้อมูลให้แล้ว กรุณาตรวจสอบและกรอกข้อมูลส่วนที่เหลือครับ', 'success');
            } else {
                throw new Error("ระบบตอบกลับผิดพลาด");
            }
        } catch (error) {
            Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ AI ได้ กรุณากรอกฟอร์มด้วยตัวเองไปก่อนนะครับ', 'error');
            console.error(error);
        }
    };

    // เมื่อเกิดข้อผิดพลาดในการฟัง
    recognition.onerror = (event) => {
        if(isProcessing) return; // ถ้าส่งไปประมวลผลแล้ว ให้ข้าม error ไป
        
        let errorMsg = 'รบกวนตรวจสอบไมโครโฟน แล้วกดพูดใหม่อีกครั้งนะครับ';
        
        if(event.error === 'not-allowed') {
            errorMsg = 'คุณยังไม่ได้กดอนุญาตให้ใช้ไมโครโฟน (Allow Microphone) กรุณาตรวจสอบการตั้งค่าเบราว์เซอร์ครับ';
        } else if (event.error === 'no-speech') {
            errorMsg = 'ระบบไม่ได้ยินเสียงพูดของคุณครับ หรือเสียงเบาเกินไป';
        }

        Swal.fire('ข้อผิดพลาดไมโครโฟน 🔇', errorMsg, 'warning');
    };

    // หยุดไมค์อัตโนมัติเมื่อพูดจบ
    recognition.onspeechend = () => {
        recognition.stop();
    };
}

function fillFormWithVoiceData(data) {
    // 1. หมวดหมู่เหตุการณ์
    if (data.incidentType) {
        const typeSelect = document.getElementById('incidentType');
        Array.from(typeSelect.options).forEach(opt => {
            if(opt.value.includes(data.incidentType)) typeSelect.value = opt.value;
        });
        typeSelect.dispatchEvent(new Event('change')); // กระตุ้นให้หน้าฟอร์มเปลี่ยน
    }

    // 2. สถานที่
    if (data.location && document.getElementById('location')) {
        document.getElementById('location').value = data.location;
    }
    
    // 3. ยานพาหนะคันที่ 1
    if (data.v1Type) {
        const v1Radio = document.querySelector(`input[name="v1Type"][value="${data.v1Type}"]`);
        if (v1Radio) { v1Radio.checked = true; window.goToP2SubStep(2); }
    }

    // 4. ยานพาหนะคันที่ 2
    if (data.v2Type) {
        const v2Radio = document.querySelector(`input[name="v2Type"][value="${data.v2Type}"]`);
        if (v2Radio) v2Radio.checked = true;
    }

    // 5. บาดเจ็บ
    if (data.hasInjury === "มี") {
        document.getElementById('inj_yes').checked = true;
        if (data.injuredCount && document.getElementById('injuredCount')) {
            document.getElementById('injuredCount').value = data.injuredCount;
        }
    } else if (data.hasInjury === "ไม่มี") {
        document.getElementById('inj_no').checked = true;
    }

    // 6. ข้อมูลพิเศษ (จับสัตว์ / ปรับ รปภ)
    if (data.animalType && document.getElementById('animalType')) {
        document.getElementById('animalType').value = data.animalType;
    }
    if (data.guardDutyPoint && document.getElementById('guardDutyPoint')) {
        document.getElementById('guardDutyPoint').value = data.guardDutyPoint;
    }
}