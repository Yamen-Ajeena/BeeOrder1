   const path = `${crypto.randomUUID()}-${file.name}`
   await supabase.storage.from('question-images').upload(path, file)
   const { data } = supabase.storage.from('question-images').getPublicUrl(path)  // → image_url