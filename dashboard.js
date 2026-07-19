const { createClient } = supabase;
const supabaseUrl = 'https://jgapbdkbfcdtckrnehbr.supabase.co';
const supabaseKey = 'sb_publishable_41ybzHBLDKkL22GGFigqRw_rRfpiJcA';
const db = createClient(supabaseUrl, supabaseKey);

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const inventoryView = document.getElementById('inventory-view');
const formView = document.getElementById('form-view');
const vehiclesList = document.getElementById('vehiclesList');
const vehicleForm = document.getElementById('vehicleForm');

// State tracking
let editingId = null;
let existingImageUrl = null;

// --- SECURITY LOCK 1: INSTANT PAGE LOAD CHECK ---
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
  }
});

// --- AUTHENTICATION ---
db.auth.onAuthStateChange((event, session) => {
  if (session) {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    loadVehicles(); // Fetch cars when logged in
  } else {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
    formView.style.display = 'none'; 
    vehiclesList.innerHTML = '';
  }
});

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;
  const loginError = document.getElementById('loginError');
  loginError.style.display = 'none';

  if (!email || !password) return loginError.style.display = 'block';

  document.getElementById('loginBtn').textContent = "Verifying...";
  const { error } = await db.auth.signInWithPassword({ email, password });
  
  if (error) {
    loginError.textContent = "Invalid credentials.";
    loginError.style.display = 'block';
    document.getElementById('loginBtn').textContent = "Secure Login";
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => db.auth.signOut());

// --- UI TOGGLES ---
document.getElementById('showAddFormBtn').addEventListener('click', () => {
  editingId = null;
  existingImageUrl = null;
  vehicleForm.reset();
  document.getElementById('formTitle').textContent = "Add New Vehicle";
  document.getElementById('imageFile').required = true;
  document.getElementById('imageOptionalText').textContent = "";
  
  inventoryView.style.display = 'none';
  formView.style.display = 'block';
});

document.getElementById('cancelBtn').addEventListener('click', () => {
  inventoryView.style.display = 'block';
  formView.style.display = 'none';
});

// --- FETCH & DISPLAY VEHICLES ---
async function loadVehicles() {
  const { data, error } = await db.from('vehicles').select('*').order('id', { ascending: false });
  if (error) return console.error(error);

  vehiclesList.innerHTML = '';
  data.forEach(car => {
    const carEl = document.createElement('div');
    carEl.className = 'vehicle-item';
    carEl.innerHTML = `
      <div class="vehicle-info">
        <h3>${car.make_model}</h3>
        <p>${car.price} • ${car.km} km</p>
      </div>
      <div class="vehicle-actions">
        <button class="action-btn edit" onclick="editVehicle('${car.id}')">Edit</button>
        <button class="action-btn delete" onclick="deleteVehicle('${car.id}')">Delete</button>
      </div>
    `;
    vehiclesList.appendChild(carEl);
  });
}

// --- DELETE VEHICLE ---
window.deleteVehicle = async (id) => {
  if (!confirm("Are you sure you want to delete this vehicle and its photo?")) return;
  
  try {
    // 1. Fetch the vehicle first to get the image URL
    const { data: vehicleData, error: fetchError } = await db
      .from('vehicles')
      .select('image_url')
      .eq('id', id)
      .single();
      
    if (fetchError) throw new Error("Could not fetch vehicle details: " + fetchError.message);

    // 2. Delete the image from the Storage Bucket
    if (vehicleData.image_url) {
      const match = vehicleData.image_url.match(/luchetti-image\/(.*)$/i);
      
      if (match && match[1]) {
        const storagePath = decodeURIComponent(match[1]); 
        
        const { error: storageError } = await db.storage
          .from('luchetti-image')
          .remove([storagePath]);
          
        if (storageError) {
          alert("Warning: Could not delete image file from storage: " + storageError.message);
        }
      }
    }

    // 3. Delete the vehicle record from the Database
    const { error: dbError } = await db
      .from('vehicles')
      .delete()
      .eq('id', id);
      
    if (dbError) throw new Error("Could not delete database record: " + dbError.message);

    // 4. Refresh the inventory list
    loadVehicles();

  } catch (error) {
    alert(error.message);
  }
};

// --- EDIT VEHICLE ---
window.editVehicle = async (id) => {
  try {
    // 1. Fetch the exact car from the database
    const { data, error } = await db
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw new Error("Error fetching vehicle details: " + error.message);

    // 2. Set the global tracking variables so the form knows we are editing
    editingId = data.id;
    existingImageUrl = data.image_url;
    
    // 3. Populate the form inputs with the fetched data
    document.getElementById('make_model').value = data.make_model;
    document.getElementById('year').value = data.year;
    document.getElementById('fuel').value = data.fuel;
    document.getElementById('km').value = data.km;
    document.getElementById('price').value = data.price;
    document.getElementById('description').value = data.description;
    
    // 4. Adjust the UI for editing
    document.getElementById('imageFile').required = false; // Image isn't required if they just want to fix a typo
    document.getElementById('imageOptionalText').textContent = "(Leave blank to keep current photo)";
    document.getElementById('formTitle').textContent = "Edit Vehicle";
    document.getElementById('saveBtn').textContent = "Update Vehicle";

    // 5. Hide the inventory list and show the form
    document.getElementById('inventory-view').style.display = 'none';
    document.getElementById('form-view').style.display = 'block';

  } catch (error) {
    alert(error.message);
  }
};

// --- FORM SUBMIT (Create or Update) ---
vehicleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const saveBtn = document.getElementById('saveBtn');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = "Saving...";
  saveBtn.disabled = true;

  try {
    const fileInput = document.getElementById('imageFile');
    let finalImageUrl = existingImageUrl;

    // If a new image was selected...
    if (fileInput.files.length > 0) {
      
      // CLEANUP OLD IMAGE IF EDITING
      if (editingId && existingImageUrl) {
        // Look for the exact lowercase bucket name
        const match = existingImageUrl.match(/luchetti-image\/(.*)$/i);
        
        if (match && match[1]) {
          const oldStoragePath = decodeURIComponent(match[1]); 
          
          const { error: cleanupError } = await db.storage
            .from('luchetti-image')
            .remove([oldStoragePath]);
            
          if (cleanupError) {
            alert("Warning: Could not delete old image from bucket. Error: " + cleanupError.message);
          }
        }
      }

      // Upload the new image
      const file = fileInput.files[0];
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      
      const { error: uploadError } = await db.storage
        .from('luchetti-image') 
        .upload(`public/${fileName}`, file);
        
      if (uploadError) throw new Error("Image upload failed: " + uploadError.message);

      // Get the new URL
      const { data: urlData } = db.storage
        .from('luchetti-image')
        .getPublicUrl(`public/${fileName}`);
        
      finalImageUrl = urlData.publicUrl;
    }

    const vehicleData = {
      make_model: document.getElementById('make_model').value,
      year: document.getElementById('year').value,
      fuel: document.getElementById('fuel').value,
      km: document.getElementById('km').value,
      price: document.getElementById('price').value,
      description: document.getElementById('description').value,
      image_url: finalImageUrl
    };

    if (editingId) {
      // Update existing record
      const { error: updateError } = await db.from('vehicles').update(vehicleData).eq('id', editingId);
      if (updateError) throw updateError;
      alert("Vehicle successfully updated!");
    } else {
      // Insert new record
      const { error: insertError } = await db.from('vehicles').insert([vehicleData]);
      if (insertError) throw insertError;
      alert("Vehicle successfully added!");
    }

    // Success flow UI resets
    document.getElementById('inventory-view').style.display = 'block';
    document.getElementById('form-view').style.display = 'none';
    
    vehicleForm.reset();
    editingId = null;
    existingImageUrl = null;
    
    loadVehicles();

  } catch (error) {
    alert(error.message);
  } finally {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
});