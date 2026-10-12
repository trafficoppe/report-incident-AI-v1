let map, currentMarker;
let injuredPersons = []; 
let currentPersonIndex = 1;
let totalPersons = 0;

document.addEventListener('DOMContentLoaded', () => {
    // เซ็ตวันและเวลาอัตโนมัติ
    const dateInput = document.getElementById('incidentDate');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
    
    initMap(); 

    // ฟังก์ชันพิมพ์เวลา 4 หลักแล้วเติม (:) ให้อัตโนมัติ
    document.querySelectorAll('.time-auto-format').forEach(input => {
        input.addEventListener('input', function(e) {
            let val = this.value.replace(/\D/g, ''); 
            if (val.length > 4) {
                val = val.substring(0, 4);
            }
            if (val.length > 2) {
                this.value = val.substring(0, 2) + ':' + val.substring(2);
            } else {
                this.value = val;
            }
        });

        input.addEventListener('blur', function() {
            let val = this.value;
            if (val.length === 5) {
                let parts = val.split(':');
                let hh = parseInt(parts[0]);
                let mm = parseInt(parts[1]);
                if (hh > 23 || mm > 59) {
                    Swal.fire({ 
                        icon: 'warning', 
                        title: 'เวลาไม่ถูกต้อง', 
                        text: 'พี่กรอกเวลาเกินจั๊ฟ! (ชั่วโมง 00-23, นาที 00-59)' 
                    });
                    this.value = '';
                }
            } else if (val.length > 0 && val.length < 5) {
                Swal.fire({ 
                    icon: 'warning', 
                    title: 'ข้อมูลไม่ครบ', 
                    text: 'กรุณากรอกเวลาให้ครบ 4 หลักครับ (เช่น 0830)' 
                });
                this.value = '';
            }
        });
    });
    
    flatpickr("input[type='time']", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
        disableMobile: "true"
    });

    // --- ลอจิกช่องทางรับแจ้งอัตโนมัติ ---
    const radioVia = document.querySelectorAll('input[name="reportedVia"]');
    const radioTypeGuard = document.getElementById('type_guard');
    const otherReporterTypes = document.getElementById('otherReporterTypes'); 

    radioVia.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'วิทยุสื่อสาร') {
                radioTypeGuard.checked = true;
                otherReporterTypes.style.display = 'none'; 
            } else {
                otherReporterTypes.style.display = 'flex'; 
                if (radioTypeGuard.checked) radioTypeGuard.checked = false;
            }
        });
    });

    // --- เปลี่ยนคำถาม ตามประเภทเหตุการณ์ ---
    const incidentTypeSelect = document.getElementById('incidentType');
    const part3Title = document.getElementById('part3Title');
    const injuryQuestionLabel = document.getElementById('injuryQuestionLabel');
    const labelInjYes = document.getElementById('label_inj_yes');
    const labelInjNo = document.getElementById('label_inj_no');

    incidentTypeSelect.addEventListener('change', function() {
        const dateLabel = document.getElementById('lbl_incidentDate');
        const timeLabel = document.getElementById('lbl_incidentTime');
        
        // ดึงข้อมูล Element ที่ใช้สลับซ่อน/โชว์
        const reportChannelSection = document.getElementById('reportChannelSection');
        const reporterTypeAndDeptSection = document.getElementById('reporterTypeAndDeptSection');
        const locationSection = document.getElementById('locationSection'); 
        const labelIncidentCause = document.getElementById('label_incidentCause');
        const penaltyAmountSection = document.getElementById('penaltyAmountSection');
        const divReportedTime = document.getElementById('div_reportedTime');
        const divArrivalTime = document.getElementById('div_arrivalTime');
        const mapSection = document.getElementById('mapSection');
        
        // Input ที่ต้องปลดล็อค/ล็อค required
        const reporterDepartmentInput = document.getElementById('reporterDepartment');
        const locationInput = document.getElementById('location'); 
        const reportedTimeInput = document.getElementById('reportedTime');
        const arrivalTimeInput = document.getElementById('arrivalTime');
        const latitudeInput = document.getElementById('latitude');
        const longitudeInput = document.getElementById('longitude');

        // รีเซ็ตคำเป็นค่าเริ่มต้น และบังคับ required ให้ช่องปกติก่อน
        if(dateLabel) dateLabel.innerText = 'วันที่เกิดเหตุ:';
        if(reportChannelSection) reportChannelSection.style.display = 'block';
        if(reporterTypeAndDeptSection) reporterTypeAndDeptSection.style.display = 'block';
        if(locationSection) locationSection.style.display = 'block'; 
        if(labelIncidentCause) labelIncidentCause.innerText = 'สาเหตุของเหตุการณ์:';
        if(penaltyAmountSection) penaltyAmountSection.style.display = 'none';
        
        if(divReportedTime) divReportedTime.style.display = 'block';
        if(divArrivalTime) divArrivalTime.style.display = 'block';
        if(mapSection) mapSection.style.display = 'block';
        
        if(reporterDepartmentInput) reporterDepartmentInput.setAttribute('required', 'true');
        if(locationInput) locationInput.setAttribute('required', 'true'); 
        if(reportedTimeInput) reportedTimeInput.setAttribute('required', 'true');
        if(arrivalTimeInput) arrivalTimeInput.setAttribute('required', 'true');
        if(latitudeInput) latitudeInput.setAttribute('required', 'true');
        if(longitudeInput) longitudeInput.setAttribute('required', 'true');

        if (this.value === 'รับส่งผู้ป่วย') {
            part3Title.innerText = 'พาร์ท 3: ข้อมูลผู้ป่วย';
            injuryQuestionLabel.innerText = 'มีผู้ป่วยหรือไม่?';
            labelInjYes.innerText = 'มีผู้ป่วย';
            labelInjNo.innerText = 'ไม่มีผู้ป่วย';
            if(timeLabel) timeLabel.innerText = 'เวลาเกิดเหตุ:';
        } else if (this.value === 'จับสัตว์เลื้อยคลาน') {
            part3Title.innerText = 'พาร์ท 3: ข้อมูลผู้ได้รับบาดเจ็บ';
            injuryQuestionLabel.innerText = 'มีผู้ถูกกัด/ได้รับบาดเจ็บ หรือไม่?';
            labelInjYes.innerText = 'มีผู้ได้รับบาดเจ็บ';
            labelInjNo.innerText = 'ไม่มีผู้ได้รับบาดเจ็บ';
            if(timeLabel) timeLabel.innerText = 'เวลาที่พบเห็น:';
        } else if (this.value === 'ปรับ รปภ.') {
            if(dateLabel) dateLabel.innerText = 'วันที่พบเจอ:';
            if(timeLabel) timeLabel.innerText = 'เวลาที่พบเจอ:';
            
            // ซ่อนช่องทางรับแจ้ง, ประเภทผู้แจ้ง, สถานที่เกิดเหตุ, เวลารับแจ้ง, เวลาเข้าถึง, และแผนที่ 
            if(reportChannelSection) reportChannelSection.style.display = 'none';
            if(reporterTypeAndDeptSection) reporterTypeAndDeptSection.style.display = 'none';
            if(locationSection) locationSection.style.display = 'none'; 
            if(divReportedTime) divReportedTime.style.display = 'none';
            if(divArrivalTime) divArrivalTime.style.display = 'none';
            if(mapSection) mapSection.style.display = 'none';
            
            // ปลดล็อค required ไม่ให้ฟอร์มติดขัดตอนกดส่ง
            if(reporterDepartmentInput) reporterDepartmentInput.removeAttribute('required');
            if(locationInput) locationInput.removeAttribute('required'); 
            if(reportedTimeInput) reportedTimeInput.removeAttribute('required');
            if(arrivalTimeInput) arrivalTimeInput.removeAttribute('required');
            if(latitudeInput) latitudeInput.removeAttribute('required');
            if(longitudeInput) longitudeInput.removeAttribute('required');

            // โชว์ช่องใส่ค่าปรับ
            if(labelIncidentCause) labelIncidentCause.innerText = 'สาเหตุการปรับ:';
            if(penaltyAmountSection) penaltyAmountSection.style.display = 'block';
            
        } else {
            part3Title.innerText = 'พาร์ท 3: ข้อมูลผู้ได้รับบาดเจ็บ';
            injuryQuestionLabel.innerText = 'มีผู้ได้รับบาดเจ็บหรือไม่?';
            labelInjYes.innerText = 'มีผู้ได้รับบาดเจ็บ';
            labelInjNo.innerText = 'ไม่มีผู้ได้รับบาดเจ็บ';
            if(timeLabel) timeLabel.innerText = 'เวลาเกิดเหตุ:';
        }
    });

    // --- ลอจิกพาร์ท 2 ข้อมูลรถชน ---
    window.goToP2SubStep = function(stepNum) {
        document.getElementById('p2_q1').style.display = 'none';
        document.getElementById('p2_q2').style.display = 'none';
        document.getElementById('p2_q3').style.display = 'none';
        document.getElementById('p2_q4').style.display = 'none';
        document.getElementById('p2_q' + stepNum).style.display = 'block';
    }

    const v1Radios = document.querySelectorAll('input[name="v1Type"]');
    const v1DriverRadios = document.querySelectorAll('input[name="driver1"]');
    const v2Radios = document.querySelectorAll('input[name="v2Type"]');
    const v2DriverRadios = document.querySelectorAll('input[name="driver2"]');
    const v2SelfWrapper = document.getElementById('v2_self_wrapper');
    const btnSkipToP3 = document.getElementById('btn_skip_to_p3');

    v1Radios.forEach(r => r.addEventListener('change', function() {
        v2SelfWrapper.style.display = (this.value === 'รถจักรยานยนต์' || this.value === 'จักรยาน') ? 'inline-block' : 'none';
        setTimeout(() => goToP2SubStep(2), 250); 
    }));
    v1DriverRadios.forEach(r => r.addEventListener('change', () => setTimeout(() => goToP2SubStep(3), 250)));
    v2Radios.forEach(r => r.addEventListener('change', function() {
        if (this.value === 'ล้มเอง' || this.value === 'ชนทรัพย์สิน') {
            btnSkipToP3.style.display = 'inline-block';
        } else {
            btnSkipToP3.style.display = 'none';
            setTimeout(() => goToP2SubStep(4), 250);
        }
    }));
    v2DriverRadios.forEach(r => r.addEventListener('change', () => setTimeout(() => navigateStep('step-2', 'forward'), 300)));

    // --- พาร์ท 4 ทรัพย์สิน ---
    const propRadios = document.querySelectorAll('input[name="propertyDamage"]');
    const propSection = document.getElementById('propertyDamageSection');
    propRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            propSection.style.display = (this.value === 'มี') ? 'block' : 'none';
        });
    });

    // --- เปลี่ยนฟิลด์ย่อยตามสถานะบุคคล (พาร์ท 3.2 คนเจ็บ) ---
    const statusRadios = document.querySelectorAll('input[name="injuredStatus"]');
    statusRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('statusFieldsSection').style.display = 'block';
            document.getElementById('div_studentId').style.display = 'none';
            document.getElementById('div_facultyDept').style.display = 'none';
            document.getElementById('div_company').style.display = 'none';

            const typeLabel = document.getElementById('incidentType').value === 'รับส่งผู้ป่วย' ? 'ผู้ป่วย' : 'ผู้บาดเจ็บ';
            const labelFaculty = document.getElementById('label_facultyDept');
            const labelName = document.getElementById('label_injuredName');
            const labelPhone = document.getElementById('label_injuredPhone');

            if (this.value === 'นักศึกษา') {
                document.getElementById('div_studentId').style.display = 'block';
                document.getElementById('div_facultyDept').style.display = 'block';
                labelFaculty.innerText = 'คณะ:';
                labelName.innerText = `ชื่อนักศึกษา:`;
                labelPhone.innerText = `เบอร์โทรศัพท์นักศึกษา:`;
            } else if (this.value === 'บุคลากร') {
                document.getElementById('div_facultyDept').style.display = 'block';
                labelFaculty.innerText = 'ส่วนงาน:';
                labelName.innerText = `ชื่อ-นามสกุล${typeLabel}:`;
                labelPhone.innerText = `เบอร์โทรศัพท์${typeLabel}:`;
            } else if (this.value === 'Outsource') {
                document.getElementById('div_facultyDept').style.display = 'block';
                document.getElementById('div_company').style.display = 'block'; 
                labelFaculty.innerText = 'ส่วนงาน:';
                labelName.innerText = `ชื่อ-นามสกุล${typeLabel}:`;
                labelPhone.innerText = `เบอร์โทรศัพท์${typeLabel}:`;
            } else if (this.value === 'บุคคลภายนอก') {
                labelName.innerText = `ชื่อ-นามสกุล${typeLabel}:`;
                labelPhone.innerText = `เบอร์โทรศัพท์${typeLabel}:`;
            }
        });
    });

    // --- แสดงช่องสถานที่ส่งอื่นๆ ---
    const destRadios = document.querySelectorAll('input[name="destinationHospitalRadio"]');
    destRadios.forEach(r => r.addEventListener('change', function(){
        document.getElementById('destinationHospitalOther').style.display = (this.value === 'สถานที่ส่งอื่นๆ') ? 'block' : 'none';
    }));
});

// ================= ฟังก์ชันจัดการลูปคนเจ็บ =================
function saveCurrentPersonData() {
    const status = document.querySelector('input[name="injuredStatus"]:checked')?.value || '';
    injuredPersons[currentPersonIndex - 1] = {
        status: status,
        studentId: document.getElementById('injuredStudentId').value,
        facultyDept: document.getElementById('injuredFacultyDept').value,
        company: document.getElementById('injuredCompany').value,
        name: document.getElementById('injuredName').value,
        phone: document.getElementById('injuredPhone').value,
        symptoms: document.getElementById('injuredSymptoms').value
    };
}

function loadPersonData(index) {
    const p = injuredPersons[index - 1] || {};
    document.querySelectorAll('input[name="injuredStatus"]').forEach(r => r.checked = false);
    document.getElementById('statusFieldsSection').style.display = 'none';

    if(p.status) {
        const r = document.querySelector(`input[name="injuredStatus"][value="${p.status}"]`);
        if(r) {
            r.checked = true;
            r.dispatchEvent(new Event('change')); 
        }
    }

    document.getElementById('injuredStudentId').value = p.studentId || '';
    document.getElementById('injuredFacultyDept').value = p.facultyDept || '';
    document.getElementById('injuredCompany').value = p.company || '';
    document.getElementById('injuredName').value = p.name || '';
    document.getElementById('injuredPhone').value = p.phone || '';
    document.getElementById('injuredSymptoms').value = p.symptoms || '';

    const typeLabel = document.getElementById('incidentType').value === 'รับส่งผู้ป่วย' ? 'ผู้ป่วย' : 'ผู้บาดเจ็บ';
    document.getElementById('personTitle').innerText = `ข้อมูล${typeLabel}คนที่ ${currentPersonIndex} / ${totalPersons}`;
}

// ================= ฟังก์ชันนำทาง (หน้าถัดไป/ย้อนกลับ) =================
window.navigateStep = function(currentStepId, direction) {
    
    // 1. ตรวจสอบข้อมูลก่อนไปหน้าถัดไป
    if (direction === 'forward') {
        const stepEl = document.getElementById(currentStepId);
        if (!stepEl) return;
        
        const requiredRadios = stepEl.querySelectorAll('input[type="radio"][required]');
        let radioGroups = {};
        requiredRadios.forEach(r => radioGroups[r.name] = true);
        for (let name in radioGroups) {
            if (!stepEl.querySelector(`input[name="${name}"]:checked`)) {
                Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาเลือกตัวเลือกให้ครบถ้วนครับ' });
                return;
            }
        }

        const requiredInputs = stepEl.querySelectorAll('input[required]:not([type="radio"]), select[required]');
        for (let field of requiredInputs) {
            if (field.offsetParent !== null && !field.value.trim()) {
                field.reportValidity();
                return;
            }
        }
    }

    // 2. คำนวณเส้นทาง
    let targetStepId = '';
    const incidentType = document.getElementById('incidentType').value;
    const hasInjury = document.querySelector('input[name="hasInjury"]:checked')?.value;
    const transferMethod = document.querySelector('input[name="transferMethod"]:checked')?.value;

    switch(currentStepId) {
        case 'step-1':
            targetStepId = (direction === 'forward') ? 
                (incidentType === 'อุบัติเหตุจากยานพาหนะ' ? 'step-2' : 
                (incidentType === 'จับสัตว์เลื้อยคลาน' ? 'step-animal' : 
                (incidentType === 'ปรับ รปภ.' ? 'step-guard-penalty' : 'step-3'))) : '';
            break;
        case 'step-2':
            targetStepId = (direction === 'forward') ? 'step-3' : 'step-1';
            break;
        case 'step-animal':
            targetStepId = (direction === 'forward') ? 'step-3' : 'step-1';
            break;
        case 'step-guard-penalty':
            targetStepId = (direction === 'forward') ? 'step-7' : 'step-1';
            break;
        case 'step-3':
            if (direction === 'backward') {
                if (incidentType === 'อุบัติเหตุจากยานพาหนะ') targetStepId = 'step-2';
                else if (incidentType === 'จับสัตว์เลื้อยคลาน') targetStepId = 'step-animal';
                else if (incidentType === 'ปรับ รปภ.') targetStepId = 'step-guard-penalty';
                else targetStepId = 'step-1';
            }
            else targetStepId = (hasInjury === 'มี') ? 'step-3-count' : (incidentType === 'อุบัติเหตุจากยานพาหนะ' ? 'step-4' : 'step-7');
            break;
        case 'step-3-count':
            if (direction === 'backward') {
                targetStepId = 'step-3';
            } else {
                totalPersons = parseInt(document.getElementById('injuredCount').value) || 1;
                currentPersonIndex = 1;
                loadPersonData(currentPersonIndex);
                targetStepId = 'step-3-person';
            }
            break;
        case 'step-3-person':
            saveCurrentPersonData();
            if (direction === 'backward') {
                if (currentPersonIndex > 1) {
                    currentPersonIndex--;
                    loadPersonData(currentPersonIndex);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    return; 
                } else {
                    targetStepId = 'step-3-count';
                }
            } else {
                if (currentPersonIndex < totalPersons) {
                    currentPersonIndex++;
                    loadPersonData(currentPersonIndex);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    return; 
                } else {
                    targetStepId = (incidentType === 'อุบัติเหตุจากยานพาหนะ') ? 'step-4' : 'step-5';
                }
            }
            break;
        case 'step-4':
            targetStepId = (direction === 'forward') ? (hasInjury === 'มี' ? 'step-5' : 'step-7') : 'step-3';
            break;
        case 'step-5':
            if (direction === 'forward') {
                targetStepId = (transferMethod === 'ปฐมพยาบาลที่เกิดเหตุ') ? 'step-7' : 'step-6';
            } else {
                if (hasInjury === 'มี') targetStepId = 'step-3-person';
                else targetStepId = (incidentType === 'อุบัติเหตุจากยานพาหนะ') ? 'step-4' : 'step-3';
            }
            break;
        case 'step-6':
            targetStepId = (direction === 'forward') ? 'step-7' : 'step-5';
            break;
        case 'step-7':
            if (direction === 'backward') {
                if (incidentType === 'ปรับ รปภ.') targetStepId = 'step-guard-penalty'; 
                else if (hasInjury === 'มี') targetStepId = (transferMethod === 'ปฐมพยาบาลที่เกิดเหตุ') ? 'step-5' : 'step-6';
                else targetStepId = (incidentType === 'อุบัติเหตุจากยานพาหนะ') ? 'step-4' : 'step-3';
            }
            break;
    }

    if (targetStepId) {
        document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
        document.getElementById(targetStepId).classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (targetStepId === 'step-1' && map) setTimeout(() => map.invalidateSize(), 100);
    }
};

function initMap() {
    const mahidolSalaya = [13.7944, 100.3235]; 
    map = L.map('map').setView(mahidolSalaya, 15);
    
    // เปลี่ยนมาใช้ Tile Layer มาตรฐานของ OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    map.on('click', function(e) {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);
        document.getElementById('latitude').value = lat;
        document.getElementById('longitude').value = lng;
        if (currentMarker) currentMarker.setLatLng(e.latlng);
        else {
            currentMarker = L.marker(e.latlng, { draggable: true }).addTo(map);
            currentMarker.on('dragend', function() {
                document.getElementById('latitude').value = currentMarker.getLatLng().lat.toFixed(6);
                document.getElementById('longitude').value = currentMarker.getLatLng().lng.toFixed(6);
            });
        }
    });
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]); 
        reader.onerror = error => reject(error);
    });
}

// ================= ส่งผลลัพธ์ =================
document.getElementById('incidentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.innerHTML = "กำลังส่งข้อมูล";
    submitBtn.disabled = true;

    try {
        const fileInput = document.getElementById('incidentImage');
        let imageBase64 = '', imageMimeType = '', imageName = '';

        if (fileInput.files.length > 0) {
            imageBase64 = typeof finalBlurredBase64 !== 'undefined' && finalBlurredBase64 !== '' ? finalBlurredBase64 : await getBase64(fileInput.files[0]);
            imageMimeType = fileInput.files[0].type;
            imageName = 'PDPA_Blurred_' + fileInput.files[0].name; 
        }

        const getValue = (id) => document.getElementById(id)?.value || '';
        const getRadioValue = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value || '';

        let finalDestination = getRadioValue('destinationHospitalRadio');
        if (finalDestination === 'สถานที่ส่งอื่นๆ') {
            finalDestination = getValue('destinationHospitalOther');
        } else if (getRadioValue('transferMethod') === 'ปฐมพยาบาลที่เกิดเหตุ') {
            finalDestination = 'ปฐมพยาบาลที่เกิดเหตุ (ไม่ได้ส่งรักษาต่อ)';
        }

        let combinedInjuredDetails = "ไม่มีผู้บาดเจ็บ/ป่วย";
        if (getRadioValue('hasInjury') === 'มี') {
            combinedInjuredDetails = injuredPersons.map((p, index) => {
                let detail = `[คนที่ ${index + 1}] ประเภท: ${p.status} | ชื่อ: ${p.name || '-'} | โทร: ${p.phone || '-'} | อาการ: ${p.symptoms || '-'}`;
                if (p.status === 'นักศึกษา') detail += ` | รหัส: ${p.studentId} | คณะ: ${p.facultyDept}`;
                if (p.status === 'บุคลากร') detail += ` | ส่วนงาน: ${p.facultyDept}`;
                if (p.status === 'Outsource') detail += ` | บริษัท: ${p.company}`;
                return detail;
            }).join('\n');
        }

        // ดึงข้อมูลช่องทางรับแจ้ง ผู้แจ้ง และ สถานที่ 
        let finalReportedVia = getRadioValue('reportedVia');
        let finalReporterType = getRadioValue('reporterType');
        let finalReporterDept = getValue('reporterDepartment');
        let finalLocation = getValue('location');
        
        if (getValue('incidentType') === 'ปรับ รปภ.') {
            finalReportedVia = '-'; 
            finalReporterType = '-';
            finalReporterDept = '-';
            finalLocation = getValue('guardDutyPoint'); 
        }

        // ดึงข้อมูลสาเหตุ และควบรวมค่าปรับเข้าไป 
        let finalCause = getValue('incidentCause');
        if (getValue('incidentType') === 'ปรับ รปภ.') {
            const penaltyVal = getValue('penaltyAmount');
            if (penaltyVal) {
                const formattedPenalty = Number(penaltyVal).toLocaleString(); 
                finalCause = `${finalCause} ปรับเงินค่าจ้าง ${formattedPenalty} บาท`;
            }
        }

        // จัดการพาร์ทรายละเอียดเพิ่มเติม สำหรับเหตุการณ์พิเศษ
        let finalAdditionalDetails = getValue('additionalDetails');
        if (getValue('incidentType') === 'จับสัตว์เลื้อยคลาน') {
            const animalInfo = `ชนิดสัตว์ที่จับได้: ${getValue('animalType')} | นำไปปล่อยที่: ${getValue('animalReleaseLocation')}`;
            finalAdditionalDetails = finalAdditionalDetails ? `${animalInfo}\n${finalAdditionalDetails}` : animalInfo;
            
        } else if (getValue('incidentType') === 'ปรับ รปภ.') {
            // 🌟 นำชื่อ รปภ. มารวมไว้ตรงนี้ด้วย
            const guardInfo = `ชื่อ รปภ.: ${getValue('guardName')} | หน่วยงาน: ${getRadioValue('guardUnit')} | ผลัด: ${getRadioValue('guardShift')} | จุดปฏิบัติงานเฉพาะ: ${getValue('guardDutyPoint')}`;
            finalAdditionalDetails = finalAdditionalDetails ? `${guardInfo}\n${finalAdditionalDetails}` : guardInfo;
        }

        // สร้างชุดข้อมูล formData ฉบับสมบูรณ์เพื่อส่งให้ API
        const formData = {
            recorderName: getValue('recorderName'),
            recorderPhone: getValue('recorderPhone'),
            reporterName: getValue('reporterName'),
            reporterPhone: getValue('reporterPhone'),
            reportedVia: finalReportedVia, 
            reporterType: finalReporterType, 
            reporterDepartment: finalReporterDept, 
            incidentDate: getValue('incidentDate'),
            location: finalLocation, 
            incidentType: getValue('incidentType'),
            incidentTime: getValue('incidentTime'),
            reportedTime: getValue('reportedTime'),
            arrivalTime: getValue('arrivalTime'),
            latitude: getValue('latitude'),
            longitude: getValue('longitude'),

            vehicle1Type: getRadioValue('v1Type'),
            driver1: getRadioValue('driver1'),
            vehicle2Type: getRadioValue('v2Type'),
            driver2: getRadioValue('driver2'),
            
            hasInjury: getRadioValue('hasInjury'),
            injuredCount: getValue('injuredCount') || "0",
            injuredDetails: combinedInjuredDetails, 
            
            propertyDamage: getRadioValue('propertyDamage'),
            propertyDamageDetails: getValue('propertyDamageDetails'),

            transferMethod: getRadioValue('transferMethod'),
            destinationHospital: finalDestination,
            serviceArrivalTime: getValue('serviceArrivalTime'),
            hospitalArrivalTime: getValue('hospitalArrivalTime'),
            
            incidentCause: finalCause,
            additionalDetails: finalAdditionalDetails, 

            imageBase64: imageBase64,       
            imageMimeType: imageMimeType,   
            imageName: imageName            
        };

        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ data: formData })
        });

        const resData = await response.json();
        
        if (resData.status === 'error') {
            throw new Error(resData.message); 
        }

        Swal.fire({
            icon: 'success',
            title: 'ส่งรายงานสำเร็จ',
            text: 'ระบบบันทึกข้อมูลลง Sheet เรียบร้อย',
            timer: 2000,
            showConfirmButton: false
        }).then(() => {
            window.location.reload(); 
        });

    } catch (error) { 
        console.error("เกิดข้อผิดพลาดในการส่งข้อมูล: ", error);
        Swal.fire({ 
            icon: 'error', 
            title: 'ระบบขัดข้อง', 
            text: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้งครับ\n' + error.message 
        });
    } finally {
        submitBtn.innerText = "ส่งรายงานข้อมูล";
        submitBtn.disabled = false;
    }
});

// ================= ระบบ Autocomplete ชื่อผู้แจ้งและเบอร์โทร =================
let staffList = [];

async function fetchStaffList() {
    try {
        const response = await fetch(CONFIG.API_URL + "?action=getStaff");
        const res = await response.json();
        if (res.status === 'success') {
            staffList = res.data;
            // 🌟 นำ Autocomplete ไปใช้กับทั้งช่องผู้รายงาน และ ผู้แจ้ง พร้อมระบุ ID ช่องเบอร์โทรที่คู่กัน
            setupAutocomplete(document.getElementById("recorderName"), staffList, "recorderPhone");
            setupAutocomplete(document.getElementById("reporterName"), staffList, "reporterPhone");
        }
    } catch (error) {
        console.error("Error fetching staff list:", error);
    }
}

// 🌟 เพิ่ม parameter: phoneInputId
function setupAutocomplete(inp, arr, phoneInputId) { 
    if (!inp) return;
    
    const wrapper = document.createElement("div");
    wrapper.setAttribute("class", "autocomplete-container");
    inp.parentNode.insertBefore(wrapper, inp);
    wrapper.appendChild(inp);

    let currentFocus;

    inp.addEventListener("input", function(e) {
        let a, b, i, val = this.value;
        closeAllLists();
        if (!val) return false;
        currentFocus = -1;

        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        this.parentNode.appendChild(a);

        let matchCount = 0;
        for (i = 0; i < arr.length; i++) {
            let matchName = arr[i].name.toUpperCase().includes(val.toUpperCase());
            let matchId = arr[i].empId && arr[i].empId.includes(val);

            if (matchName || matchId) {
                matchCount++;
                if (matchCount > 10) break; 

                let phoneStr = arr[i].phone ? String(arr[i].phone).trim() : '';
                if (phoneStr && phoneStr !== '-' && !phoneStr.startsWith('0')) {
                    phoneStr = '0' + phoneStr;
                }

                b = document.createElement("DIV");
                let regex = new RegExp(`(${val})`, "gi");
                
                let displayId = arr[i].empId ? `[${arr[i].empId}] ` : '';
                let displayName = arr[i].name;

                if (matchId) displayId = displayId.replace(regex, "<strong>$1</strong>");
                if (matchName) displayName = displayName.replace(regex, "<strong>$1</strong>");

                b.innerHTML = displayId + displayName;
                b.innerHTML += ` <span style="font-size:0.8em; color:#666;">(${phoneStr || 'ไม่มีเบอร์'})</span>`;
                
                b.innerHTML += `<input type="hidden" value="${arr[i].name}">`;
                b.innerHTML += `<input type="hidden" data-phone="${phoneStr}">`;

                b.addEventListener("click", function(e) {
                    e.preventDefault();
                    inp.value = this.getElementsByTagName("input")[0].value;
                    const phone = this.getElementsByTagName("input")[1].getAttribute("data-phone");
                    if (phone && phone !== '-') {
                        // 🌟 ดึงค่าเบอร์โทรไปใส่ในช่องที่กำหนด (recorderPhone หรือ reporterPhone)
                        document.getElementById(phoneInputId).value = phone; 
                    }
                    closeAllLists();
                });
                a.appendChild(b);
            }
        }
    });

    inp.addEventListener("keydown", function(e) {
        let x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        
        if (e.keyCode == 40) { 
            currentFocus++;
            addActive(x);
        } else if (e.keyCode == 38) { 
            currentFocus--;
            addActive(x);
        } else if (e.keyCode == 13) { 
            e.preventDefault(); 
            if (currentFocus > -1) {
                if (x) x[currentFocus].click();
            }
        }
    });

    function addActive(x) {
        if (!x) return false;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        x[currentFocus].classList.add("autocomplete-active");
    }

    function removeActive(x) {
        for (let i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    }

    function closeAllLists(elmnt) {
        let x = document.getElementsByClassName("autocomplete-items");
        for (let i = 0; i < x.length; i++) {
            if (elmnt != x[i] && elmnt != inp) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }
    
    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    fetchStaffList();
});